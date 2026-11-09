begin;

-- Access is independent of ID approval; privileged state and its audit stay private.
create table bytesaver_private.account_access (
  user_id uuid primary key references public.users(id) on delete cascade,
  status text not null check (status in ('active', 'suspended')),
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  changed_by uuid references public.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
create table bytesaver_private.account_access_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  status text not null check (status in ('active', 'suspended')),
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  changed_by uuid references public.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index account_access_history_user_date_idx on bytesaver_private.account_access_history(user_id, changed_at desc);
create index account_access_changed_by_idx on bytesaver_private.account_access(changed_by);
create index account_access_history_changed_by_idx on bytesaver_private.account_access_history(changed_by);
alter table bytesaver_private.account_access enable row level security;
alter table bytesaver_private.account_access_history enable row level security;
revoke all on bytesaver_private.account_access, bytesaver_private.account_access_history from public, anon, authenticated;

create function bytesaver_private.account_is_active(p_user_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and p_user_id is not null and not exists (
    select 1 from bytesaver_private.account_access where user_id = p_user_id and status = 'suspended'
  );
$$;
create or replace function bytesaver_private.is_administrator() returns boolean
language sql stable security definer set search_path = '' as $$
  select bytesaver_private.account_is_active(auth.uid()) and exists (
    select 1 from bytesaver_private.administrators where user_id = auth.uid()
  );
$$;
create or replace function bytesaver_private.is_verified() returns boolean
language sql stable security definer set search_path = '' as $$
  select bytesaver_private.account_is_active(auth.uid()) and exists (
    select 1 from public.identity_submissions where user_id = auth.uid() and status = 'approved'
  );
$$;

create function bytesaver_private.get_account_access() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sign in to check account access.'; end if;
  return coalesce((select jsonb_build_object('status', status, 'reason', reason, 'changed_at', changed_at)
    from bytesaver_private.account_access where user_id = auth.uid()), jsonb_build_object('status', 'active'));
end;
$$;
create function public.get_account_access() returns jsonb
language sql stable security invoker set search_path = '' as $$ select bytesaver_private.get_account_access(); $$;

create function bytesaver_private.admin_list_users(p_search text, p_access text, p_verification text, p_page integer) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not bytesaver_private.is_administrator() then raise exception 'Administrator access is required.'; end if;
  if p_access is null or p_access not in ('all','active','suspended') or p_verification is null
    or p_verification not in ('all','not_submitted','pending_review','approved','rejected')
    or p_page is null or p_page < 1 or p_page > 1000000 or length(coalesce(p_search,'')) > 150 then
    raise exception 'Choose valid search filters and page.';
  end if;
  return (
    with accounts as materialized (
      select u.id, u.full_name, u.display_name, u.email, u.phone, u.created_at,
        coalesce(a.status, 'active') as access_status,
        coalesce(v.status, 'not_submitted') as verification_status,
        exists (select 1 from bytesaver_private.administrators ad where ad.user_id = u.id) as is_admin
      from public.users u
      left join bytesaver_private.account_access a on a.user_id = u.id
      left join lateral (select s.status from public.identity_submissions s where s.user_id = u.id
        order by s.submitted_at desc, s.id desc limit 1) v on true
      where (coalesce(btrim(p_search), '') = '' or strpos(lower(concat_ws(' ',u.full_name,u.display_name,u.email,u.phone)),lower(btrim(p_search))) > 0)
    ), filtered as materialized (
      select * from accounts where (p_access = 'all' or access_status = p_access)
        and (p_verification = 'all' or verification_status = p_verification)
    ), page_rows as (
      select * from filtered order by created_at desc, id limit 20 offset ((p_page - 1) * 20)
    ) select jsonb_build_object('total', (select count(*) from filtered),
      'users', coalesce((select jsonb_agg(to_jsonb(p) order by p.created_at desc,p.id) from page_rows p), '[]'::jsonb))
  );
end;
$$;
create function public.admin_list_users(p_search text default '', p_access text default 'all', p_verification text default 'all', p_page integer default 1) returns jsonb
language sql stable security invoker set search_path = '' as $$ select bytesaver_private.admin_list_users(p_search,p_access,p_verification,p_page); $$;

create function bytesaver_private.admin_get_user(p_user_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_result jsonb;
begin
  if not bytesaver_private.is_administrator() then raise exception 'Administrator access is required.'; end if;
  select jsonb_build_object('id',u.id,'email',u.email,'full_name',u.full_name,'display_name',u.display_name,
    'phone',u.phone,'address',u.address,'barangay_name',b.name,'created_at',u.created_at,
    'access_status',coalesce(a.status,'active'),'verification_status',coalesce(v.status,'not_submitted'),
    'verification_id',v.id,'is_admin',exists(select 1 from bytesaver_private.administrators ad where ad.user_id=u.id),
    'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.changed_at desc,h.id) from (
      select ah.id,ah.status,ah.reason,ah.changed_at,ah.changed_by,coalesce(reviewer.full_name,reviewer.display_name,reviewer.email) as changed_by_name
      from bytesaver_private.account_access_history ah left join public.users reviewer on reviewer.id=ah.changed_by
      where ah.user_id=u.id order by ah.changed_at desc,ah.id limit 100
    ) h),'[]'::jsonb)) into v_result
  from public.users u left join public.barangays b on b.id=u.barangay_id
  left join bytesaver_private.account_access a on a.user_id=u.id
  left join lateral (select s.id,s.status from public.identity_submissions s where s.user_id=u.id
    order by s.submitted_at desc,s.id desc limit 1) v on true
  where u.id=p_user_id;
  if v_result is null then raise exception 'Account no longer exists. Refresh the directory.'; end if;
  return v_result;
end;
$$;
create function public.admin_get_user(p_user_id uuid) returns jsonb
language sql stable security invoker set search_path = '' as $$ select bytesaver_private.admin_get_user(p_user_id); $$;

create function bytesaver_private.admin_set_user_access(p_user_id uuid, p_status text, p_expected_status text, p_reason text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_status text;
begin
  if not bytesaver_private.is_administrator() then raise exception 'Administrator access is required.'; end if;
  if p_status is null or p_status not in ('active','suspended') or p_expected_status is null
    or p_expected_status not in ('active','suspended') then raise exception 'Choose a valid access state.'; end if;
  if p_reason is null or length(btrim(p_reason)) not between 3 and 1000 then raise exception 'Enter a reason between 3 and 1000 characters.'; end if;
  -- Lock the existing profile so concurrent first-time access changes serialize too.
  perform 1 from public.users where id=p_user_id for update;
  if not found then raise exception 'Account no longer exists. Refresh the directory.'; end if;
  if p_user_id=auth.uid() or exists(select 1 from bytesaver_private.administrators where user_id=p_user_id) then
    raise exception 'Administrator accounts and your own account are protected from access changes.';
  end if;
  select coalesce((select status from bytesaver_private.account_access where user_id=p_user_id),'active') into v_status;
  if v_status <> p_expected_status then raise exception 'Account access changed since you opened it. Reload the account before trying again.'; end if;
  if v_status = p_status then raise exception 'Account already has this access state.'; end if;
  insert into bytesaver_private.account_access(user_id,status,reason,changed_by,changed_at)
    values(p_user_id,p_status,btrim(p_reason),auth.uid(),clock_timestamp())
    on conflict(user_id) do update set status=excluded.status,reason=excluded.reason,changed_by=excluded.changed_by,changed_at=excluded.changed_at;
  insert into bytesaver_private.account_access_history(user_id,status,reason,changed_by,changed_at)
    values(p_user_id,p_status,btrim(p_reason),auth.uid(),clock_timestamp());
end;
$$;
create function public.admin_set_user_access(p_user_id uuid, p_status text, p_expected_status text, p_reason text) returns void
language sql security invoker set search_path = '' as $$ select bytesaver_private.admin_set_user_access(p_user_id,p_status,p_expected_status,p_reason); $$;

revoke all on function bytesaver_private.account_is_active(uuid), bytesaver_private.get_account_access(), public.get_account_access(),
  bytesaver_private.admin_list_users(text,text,text,integer), public.admin_list_users(text,text,text,integer),
  bytesaver_private.admin_get_user(uuid), public.admin_get_user(uuid),
  bytesaver_private.admin_set_user_access(uuid,text,text,text), public.admin_set_user_access(uuid,text,text,text) from public, anon;
grant execute on function bytesaver_private.account_is_active(uuid), bytesaver_private.get_account_access(), public.get_account_access(),
  bytesaver_private.admin_list_users(text,text,text,integer), public.admin_list_users(text,text,text,integer),
  bytesaver_private.admin_get_user(uuid), public.admin_get_user(uuid),
  bytesaver_private.admin_set_user_access(uuid,text,text,text), public.admin_set_user_access(uuid,text,text,text) to authenticated;

-- Restrictive policies also constrain older permissive policies and existing JWTs.
create policy "Active accounts browse active sellers" on public.listings as restrictive for select to authenticated
  using ((select bytesaver_private.account_is_active(auth.uid())) and bytesaver_private.account_is_active(seller_id));
create policy "Active accounts access saved carts" on public.cart_items as restrictive for all to authenticated
  using ((select bytesaver_private.account_is_active(auth.uid())))
  with check ((select bytesaver_private.is_verified()) and exists (select 1 from public.listings l where l.id=listing_id));
create policy "Active sellers upload listing images" on storage.objects as restrictive for insert to authenticated
  with check (bucket_id <> 'listing-images' or (select bytesaver_private.is_verified()));
create policy "Active sellers update listing images" on storage.objects as restrictive for update to authenticated
  using (bucket_id <> 'listing-images' or (select bytesaver_private.is_verified()))
  with check (bucket_id <> 'listing-images' or (select bytesaver_private.is_verified()));

commit;
