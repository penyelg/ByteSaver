begin;
create schema if not exists bytesaver_private;
revoke all on schema bytesaver_private from public, anon;
grant usage on schema bytesaver_private to authenticated;
create table bytesaver_private.administrators (
  user_id uuid primary key references public.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table bytesaver_private.administrators enable row level security;
revoke all on bytesaver_private.administrators from public, anon, authenticated;
alter table public.users add column if not exists full_name text;
alter table public.users add column if not exists address text;
-- Only the validated submission operation may change identity details.
revoke update on public.users from anon, authenticated;
revoke update (phone, barangay_id, full_name, address) on public.users from anon, authenticated;
grant update (display_name, avatar_url) on public.users to authenticated;

create table public.identity_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  full_name text not null check (length(btrim(full_name)) between 2 and 150),
  address text not null check (length(btrim(address)) between 3 and 500),
  phone text not null check (phone ~ '^\+639[0-9]{9}$'),
  barangay_id uuid not null references public.barangays(id),
  id_type text not null check (id_type in ('Philippine National ID', 'Passport', 'Driver’s license', 'UMID', 'Other government-issued ID')),
  document_path text not null unique,
  status text not null default 'pending_review' check (status in ('pending_review', 'approved', 'rejected')),
  submitted_at timestamptz not null default now(),
  reviewed_by uuid references public.users(id),
  reviewed_at timestamptz,
  review_reason text,
  constraint identity_review_consistency check (
    (status = 'pending_review' and reviewed_by is null and reviewed_at is null and review_reason is null)
    or (status in ('approved', 'rejected') and reviewed_by is not null and reviewed_at is not null
      and length(btrim(review_reason)) between 3 and 1000)
  )
);
create index identity_submissions_user_date_idx on public.identity_submissions(user_id, submitted_at desc);
create index identity_submissions_queue_idx on public.identity_submissions(status, submitted_at);
create unique index identity_one_open_submission_idx on public.identity_submissions(user_id) where status in ('pending_review', 'approved');
alter table public.identity_submissions enable row level security;
revoke all on public.identity_submissions from public, anon, authenticated;
grant select on public.identity_submissions to authenticated;

-- Internal definers have fixed search paths and explicit caller authorization.
create function bytesaver_private.is_administrator() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from bytesaver_private.administrators where user_id = auth.uid());
$$;
create function bytesaver_private.is_verified() returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (select 1 from public.identity_submissions where user_id = auth.uid() and status = 'approved');
$$;
revoke all on function bytesaver_private.is_administrator(), bytesaver_private.is_verified() from public, anon;
grant execute on function bytesaver_private.is_administrator(), bytesaver_private.is_verified() to authenticated;
create function public.is_identity_administrator() returns boolean
language sql stable security invoker set search_path = '' as $$ select bytesaver_private.is_administrator(); $$;
revoke all on function public.is_identity_administrator() from public, anon;
grant execute on function public.is_identity_administrator() to authenticated;
create policy "Owners and reviewers read identity submissions" on public.identity_submissions
  for select to authenticated using (user_id = (select auth.uid()) or (select bytesaver_private.is_administrator()));

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('identity-documents', 'identity-documents', false, 5242880, array['image/jpeg','image/png','image/webp']);
create policy "Upload own identity photo" on storage.objects for insert to authenticated
  with check (bucket_id = 'identity-documents' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Read private identity photos" on storage.objects for select to authenticated
  using (bucket_id = 'identity-documents' and ((storage.foldername(name))[1] = (select auth.uid())::text or (select bytesaver_private.is_administrator())));
-- Restrictive policies prevent future broad storage policies from exposing IDs.
create policy "Identity photo read isolation" on storage.objects as restrictive for select to anon, authenticated
  using (bucket_id <> 'identity-documents' or (select auth.uid()) is not null and
    ((storage.foldername(name))[1] = (select auth.uid())::text or (select bytesaver_private.is_administrator())));
create policy "Identity photo upload isolation" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'identity-documents' or (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "Identity photos are immutable" on storage.objects as restrictive for update to anon, authenticated
  using (bucket_id <> 'identity-documents') with check (bucket_id <> 'identity-documents');
create policy "Identity photos require trusted retention cleanup" on storage.objects as restrictive for delete to anon, authenticated
  using (bucket_id <> 'identity-documents');

create function bytesaver_private.submit_identity(p_full_name text, p_address text, p_phone text, p_barangay_id uuid, p_id_type text, p_document_path text)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_user uuid := auth.uid(); v_id uuid;
begin
  if v_user is null then raise exception 'Sign in to submit your ID.'; end if;
  perform 1 from public.users where id = v_user for update;
  if not found then raise exception 'Your profile is missing. Contact support.'; end if;
  if exists (select 1 from public.identity_submissions where user_id = v_user and status in ('pending_review','approved')) then
    raise exception 'Your ID is already pending review or approved.';
  end if;
  if not exists (select 1 from public.barangays where id = p_barangay_id and is_active) then raise exception 'Choose an active barangay.'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'identity-documents'
    and name = p_document_path and (storage.foldername(name))[1] = v_user::text) then
    raise exception 'Upload your own ID photo before submitting.';
  end if;
  insert into public.identity_submissions(user_id, full_name, address, phone, barangay_id, id_type, document_path)
    values (v_user,btrim(p_full_name),btrim(p_address),p_phone,p_barangay_id,p_id_type,p_document_path) returning id into v_id;
  update public.users set full_name = btrim(p_full_name), address = btrim(p_address), phone = p_phone, barangay_id = p_barangay_id where id = v_user;
  return v_id;
end;
$$;
create function public.submit_identity(p_full_name text, p_address text, p_phone text, p_barangay_id uuid, p_id_type text, p_document_path text)
returns uuid language sql security invoker set search_path = '' as $$
  select bytesaver_private.submit_identity(p_full_name,p_address,p_phone,p_barangay_id,p_id_type,p_document_path);
$$;
create function bytesaver_private.review_identity(p_submission_id uuid, p_decision text, p_reason text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null or not bytesaver_private.is_administrator() then raise exception 'Administrator access is required.'; end if;
  if p_decision is null or p_decision not in ('approved','rejected') then raise exception 'Choose approve or reject.'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 3 and 1000 then raise exception 'Enter a review note between 3 and 1000 characters.'; end if;
  update public.identity_submissions set status = p_decision, review_reason = btrim(p_reason), reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_submission_id and status = 'pending_review' and user_id <> auth.uid();
  if not found then raise exception 'Submission was already reviewed, is missing, or belongs to you. Refresh the queue.'; end if;
end;
$$;
create function public.review_identity(p_submission_id uuid, p_decision text, p_reason text)
returns void language sql security invoker set search_path = '' as $$ select bytesaver_private.review_identity(p_submission_id,p_decision,p_reason); $$;
revoke all on function bytesaver_private.submit_identity(text,text,text,uuid,text,text), public.submit_identity(text,text,text,uuid,text,text),
  bytesaver_private.review_identity(uuid,text,text), public.review_identity(uuid,text,text) from public, anon;
grant execute on function bytesaver_private.submit_identity(text,text,text,uuid,text,text), public.submit_identity(text,text,text,uuid,text,text),
  bytesaver_private.review_identity(uuid,text,text), public.review_identity(uuid,text,text) to authenticated;

create policy "Approved identity required to create listings" on public.listings as restrictive
  for insert to authenticated with check ((select bytesaver_private.is_verified()));
create policy "Approved identity required to update listings" on public.listings as restrictive
  for update to authenticated using ((select bytesaver_private.is_verified())) with check ((select bytesaver_private.is_verified()));
commit;
