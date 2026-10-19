-- Run against a compatible database after the identity migration.
-- Synthetic rows and decisions are rolled back; no real ID document is used.
begin;
do $$
declare
  applicant uuid := gen_random_uuid(); reviewer uuid := gen_random_uuid(); stranger uuid := gen_random_uuid();
  barangay uuid; first_submission uuid; second_submission uuid; own_submission uuid;
  affected integer; visible integer;
begin
  select id into barangay from public.barangays where is_active limit 1;
  if barangay is null then raise exception 'Test needs an active barangay.'; end if;
  insert into auth.users(id,email,raw_user_meta_data) values
    (applicant, applicant::text || '@identity-test.invalid', '{}'::jsonb),
    (reviewer, reviewer::text || '@identity-test.invalid', '{}'::jsonb),
    (stranger, stranger::text || '@identity-test.invalid', '{}'::jsonb);
  insert into bytesaver_private.administrators(user_id) values (reviewer);
  insert into storage.objects(bucket_id,name) values
    ('identity-documents',applicant::text || '/first.jpg'),
    ('identity-documents',applicant::text || '/second.jpg'),
    ('identity-documents',reviewer::text || '/own.jpg');
  if has_function_privilege('anon','public.submit_identity(text,text,text,uuid,text,text)','execute') then
    raise exception 'Anonymous users can submit identity.';
  end if;
  if has_table_privilege('authenticated','bytesaver_private.administrators','insert') then
    raise exception 'Users can appoint administrators.';
  end if;

  perform set_config('request.jwt.claim.sub',applicant::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',applicant,'role','authenticated')::text,true);
  set local role authenticated;
  if public.is_identity_administrator() then raise exception 'Applicant became admin.'; end if;
  begin
    insert into public.listings(seller_id,brand,model,category,price,condition) values(applicant,'Test','Test','CPU',100,'Good');
    raise exception 'Unverified seller created listing.';
  exception when insufficient_privilege then null; end;
  begin
    update public.users set phone = '+639123456789' where id = applicant;
    raise exception 'Client changed protected identity fields.';
  exception when insufficient_privilege then null; end;
  begin
    perform public.submit_identity('Test Applicant','Test street','+639123456789',barangay,'Passport',reviewer::text || '/own.jpg');
    raise exception 'Accepted someone else''s ID.';
  exception when raise_exception then if sqlerrm not like 'Upload your own%' then raise; end if; end;
  begin
    perform public.submit_identity('Test Applicant','Test street','invalid',barangay,'Passport',applicant::text || '/first.jpg');
    raise exception 'Invalid mobile was accepted.';
  exception when check_violation then null; end;
  first_submission := public.submit_identity('Test Applicant','Test street','+639123456789',barangay,'Passport',applicant::text || '/first.jpg');
  begin
    insert into public.listings(seller_id,brand,model,category,price,condition) values(applicant,'Test','Test','CPU',100,'Good');
    raise exception 'Pending applicant created listing after completing profile.';
  exception when insufficient_privilege then null; end;
  begin
    perform public.submit_identity('Test Applicant','Test street','+639123456789',barangay,'Passport',applicant::text || '/second.jpg');
    raise exception 'Duplicate pending submission accepted.';
  exception when raise_exception then if sqlerrm not like 'Your ID is already%' then raise; end if; end;
  begin
    update public.identity_submissions set status='approved' where id=first_submission;
    raise exception 'Client approved themselves.';
  exception when insufficient_privilege then null; end;
  begin
    perform public.review_identity(first_submission,'approved','Looks clear');
    raise exception 'Applicant reviewed a submission.';
  exception when raise_exception then if sqlerrm <> 'Administrator access is required.' then raise; end if; end;
  begin
    delete from storage.objects where bucket_id='identity-documents' and name=applicant::text || '/first.jpg';
    get diagnostics affected = row_count;
    if affected <> 0 then raise exception 'Submitted photo can be deleted.'; end if;
  exception when insufficient_privilege then null; end;
  update storage.objects set name=applicant::text || '/renamed.jpg' where bucket_id='identity-documents' and name=applicant::text || '/first.jpg';
  get diagnostics affected = row_count;
  if affected <> 0 then raise exception 'Submitted photo can be replaced.'; end if;
  reset role;

  perform set_config('request.jwt.claim.sub',stranger::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',stranger,'role','authenticated')::text,true);
  set local role authenticated;
  select count(*) into visible from public.identity_submissions where user_id=applicant;
  if visible <> 0 then raise exception 'Stranger can read identity details.'; end if;
  select count(*) into visible from storage.objects where bucket_id='identity-documents' and name=applicant::text || '/first.jpg';
  if visible <> 0 then raise exception 'Stranger can read ID photo.'; end if;
  reset role;

  perform set_config('request.jwt.claim.sub',reviewer::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated')::text,true);
  set local role authenticated;
  if not public.is_identity_administrator() then raise exception 'Reviewer access failed.'; end if;
  select count(*) into visible from storage.objects where bucket_id='identity-documents' and name=applicant::text || '/first.jpg';
  if visible <> 1 then raise exception 'Reviewer cannot access private photo.'; end if;
  own_submission := public.submit_identity('Test Reviewer','Test street','+639123456789',barangay,'Passport',reviewer::text || '/own.jpg');
  begin
    perform public.review_identity(own_submission,'approved','Self review');
    raise exception 'Administrator approved own ID.';
  exception when raise_exception then if sqlerrm not like 'Submission was already reviewed%' then raise; end if; end;
  perform public.review_identity(first_submission,'rejected','Please upload a clearer photo.');
  reset role;

  perform set_config('request.jwt.claim.sub',applicant::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',applicant,'role','authenticated')::text,true);
  set local role authenticated;
  if bytesaver_private.is_verified() then raise exception 'Rejected applicant is verified.'; end if;
  second_submission := public.submit_identity('Test Applicant','Corrected street','+639123456789',barangay,'Passport',applicant::text || '/second.jpg');
  select count(*) into visible from public.identity_submissions where user_id=applicant;
  if visible <> 2 then raise exception 'Resubmission erased previous review.'; end if;
  reset role;

  perform set_config('request.jwt.claim.sub',reviewer::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated')::text,true);
  set local role authenticated;
  perform public.review_identity(second_submission,'approved','Name and photo reviewed.');
  begin
    perform public.review_identity(second_submission,'rejected','Duplicate review');
    raise exception 'Final review was overwritten.';
  exception when raise_exception then if sqlerrm not like 'Submission was already reviewed%' then raise; end if; end;
  reset role;

  perform set_config('request.jwt.claim.sub',applicant::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',applicant,'role','authenticated')::text,true);
  set local role authenticated;
  if not bytesaver_private.is_verified() then raise exception 'Approved applicant cannot transact.'; end if;
  insert into public.listings(seller_id,brand,model,category,price,condition) values(applicant,'Test','Test','CPU',100,'Good');
  reset role;
end;
$$;
rollback;
select 'Identity authorization, privacy, review history, and listing gate checks passed (fixtures rolled back).' as result;
