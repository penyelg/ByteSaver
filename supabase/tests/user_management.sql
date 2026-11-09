-- Synthetic accounts only. All fixtures and access changes are rolled back.
begin;
do $$
declare
  member uuid := gen_random_uuid(); reviewer uuid := gen_random_uuid(); other_admin uuid := gen_random_uuid();
  barangay uuid; listing uuid; submission uuid := gen_random_uuid(); result jsonb; visible integer;
begin
  select id into barangay from public.barangays where is_active limit 1;
  if barangay is null then raise exception 'Test needs an active barangay.'; end if;
  insert into auth.users(id,email,raw_user_meta_data) values
    (member,member::text || '@management-test.invalid','{}'::jsonb),
    (reviewer,reviewer::text || '@management-test.invalid','{}'::jsonb),
    (other_admin,other_admin::text || '@management-test.invalid','{}'::jsonb);
  insert into bytesaver_private.administrators(user_id) values(reviewer),(other_admin);
  update public.users set full_name='Management Test Member',phone='+639123456789',barangay_id=barangay where id=member;
  insert into public.identity_submissions(id,user_id,full_name,address,phone,barangay_id,id_type,document_path,status,reviewed_by,reviewed_at,review_reason)
    values(submission,member,'Management Test Member','Test street','+639123456789',barangay,'Passport',member::text || '/synthetic.jpg','approved',reviewer,now(),'Synthetic approval');
  insert into public.listings(seller_id,brand,model,category,price,condition) values(member,'Test','Management test','CPU',100,'Good') returning id into listing;
  if has_function_privilege('anon','public.admin_list_users(text,text,text,integer)','execute')
    or has_function_privilege('anon','public.admin_get_user(uuid)','execute')
    or has_function_privilege('anon','public.admin_set_user_access(uuid,text,text,text)','execute') then raise exception 'Anonymous admin access.'; end if;
  if has_table_privilege('authenticated','bytesaver_private.account_access','update')
    or has_table_privilege('authenticated','bytesaver_private.account_access_history','insert') then raise exception 'Direct access state writes granted.'; end if;

  perform set_config('request.jwt.claim.sub',member::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
  set local role authenticated;
  if public.get_account_access()->>'status' <> 'active' then raise exception 'New accounts must be active.'; end if;
  begin perform public.admin_list_users(); raise exception 'Member read directory.';
    exception when raise_exception then if sqlerrm <> 'Administrator access is required.' then raise; end if; end;
  begin perform public.admin_get_user(reviewer); raise exception 'Member read another profile.';
    exception when raise_exception then if sqlerrm <> 'Administrator access is required.' then raise; end if; end;
  begin perform public.admin_set_user_access(reviewer,'suspended','active','Unauthorized'); raise exception 'Member suspended an account.';
    exception when raise_exception then if sqlerrm <> 'Administrator access is required.' then raise; end if; end;
  insert into public.cart_items(user_id,listing_id,quantity) values(member,listing,1);
  reset role;

  perform set_config('request.jwt.claim.sub',reviewer::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated')::text,true);
  set local role authenticated;
  result := public.admin_list_users(member::text || '@management-test.invalid','all','approved',1);
  if (result->>'total')::integer <> 1 or result->'users'->0->>'id' <> member::text then raise exception 'Search/filter failed.'; end if;
  if jsonb_array_length(public.admin_list_users(member::text || '@management-test.invalid','all','approved',2)->'users') <> 0 then raise exception 'Pagination failed.'; end if;
  begin perform public.admin_set_user_access(reviewer,'suspended','active','Self suspension'); raise exception 'Self suspended.';
    exception when raise_exception then if sqlerrm not like 'Administrator accounts and your own%' then raise; end if; end;
  begin perform public.admin_set_user_access(other_admin,'suspended','active','Admin suspension'); raise exception 'Admin suspended.';
    exception when raise_exception then if sqlerrm not like 'Administrator accounts and your own%' then raise; end if; end;
  begin perform public.admin_set_user_access(member,'suspended','active',' '); raise exception 'Blank reason accepted.';
    exception when raise_exception then if sqlerrm not like 'Enter a reason%' then raise; end if; end;
  perform public.admin_set_user_access(member,'suspended','active','Synthetic suspension');
  result := public.admin_get_user(member);
  if result->>'access_status' <> 'suspended' or result->>'verification_status' <> 'approved'
    or jsonb_array_length(result->'history') <> 1 then raise exception 'Suspension or audit failed.'; end if;
  begin perform public.admin_set_user_access(member,'active','active','Stale update'); raise exception 'Stale access update accepted.';
    exception when raise_exception then if sqlerrm not like 'Account access changed%' then raise; end if; end;
  reset role;

  perform set_config('request.jwt.claim.sub',member::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
  set local role authenticated;
  result := public.get_account_access();
  if result->>'status' <> 'suspended' or result->>'reason' <> 'Synthetic suspension' then raise exception 'Own suspension reason missing.'; end if;
  if bytesaver_private.is_verified() then raise exception 'Suspended member can transact.'; end if;
  select count(*) into visible from public.listings where id=listing;
  if visible <> 0 then raise exception 'Suspended member can browse listings.'; end if;
  select count(*) into visible from public.cart_items where user_id=member;
  if visible <> 0 then raise exception 'Suspended member can read saved cart.'; end if;
  begin insert into public.listings(seller_id,brand,model,category,price,condition) values(member,'Test','Test','CPU',100,'Good'); raise exception 'Suspended member created listing.';
    exception when insufficient_privilege then null; end;
  begin insert into public.cart_items(user_id,listing_id,quantity) values(member,listing,2); raise exception 'Suspended member added to cart.';
    exception when insufficient_privilege then null; end;
  begin insert into storage.objects(bucket_id,name) values('listing-images',member::text || '/blocked.jpg'); raise exception 'Suspended member uploaded listing photo.';
    exception when insufficient_privilege then null; end;
  reset role;

  -- Another active member with a completed profile cannot see the suspended seller.
  update public.users set phone='+639123456789',barangay_id=barangay where id=other_admin;
  perform set_config('request.jwt.claim.sub',other_admin::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',other_admin,'role','authenticated')::text,true);
  set local role authenticated;
  select count(*) into visible from public.listings where id=listing;
  if visible <> 0 then raise exception 'Suspended seller listing is visible.'; end if;
  reset role;

  perform set_config('request.jwt.claim.sub',reviewer::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',reviewer,'role','authenticated')::text,true);
  set local role authenticated;
  perform public.admin_set_user_access(member,'active','suspended','Synthetic reactivation');
  result := public.admin_get_user(member);
  if result->>'verification_status' <> 'approved' or jsonb_array_length(result->'history') <> 2 then raise exception 'Reactivation erased history.'; end if;
  reset role;

  perform set_config('request.jwt.claim.sub',member::text,true);
  perform set_config('request.jwt.claims',jsonb_build_object('sub',member,'role','authenticated')::text,true);
  set local role authenticated;
  if not bytesaver_private.is_verified() then raise exception 'Reactivated member cannot transact.'; end if;
  select count(*) into visible from public.listings where id=listing;
  if visible <> 1 then raise exception 'Reactivated seller listing is hidden.'; end if;
  select count(*) into visible from public.cart_items where user_id=member;
  if visible <> 1 then raise exception 'Saved cart was lost.'; end if;
  reset role;
end;
$$;
rollback;
select 'User management authorization, search, suspension, reactivation, and audit checks passed (fixtures rolled back).' as result;
