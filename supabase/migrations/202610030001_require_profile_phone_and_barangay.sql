-- ByteSaver profile onboarding: phone and Isabel, Leyte barangay are required
-- by the app before marketplace access. Phone numbers are collected but are
-- NOT OTP-verified by this migration.

begin;

alter table public.users
  add column if not exists phone text,
  add column if not exists barangay_id uuid;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'users_barangay_id_fkey'
      and conrelid = 'public.users'::regclass
  ) then
    alter table public.users
      add constraint users_barangay_id_fkey
      foreign key (barangay_id)
      references public.barangays(id)
      on delete restrict;
  end if;
end
$$;

create index if not exists users_barangay_id_idx
  on public.users (barangay_id);

alter table public.users enable row level security;

drop policy if exists "Users can read own profile" on public.users;
create policy "Users can read own profile"
  on public.users
  for select
  to authenticated
  using ((select auth.uid()) = id);

drop policy if exists "Users can update own profile" on public.users;
create policy "Users can update own profile"
  on public.users
  for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- Restrictive policies make the profile-completion rule apply even when the
-- existing permissive listings/cart policies allow the operation otherwise.
drop policy if exists "Require completed profile to read listings" on public.listings;
create policy "Require completed profile to read listings"
  on public.listings
  as restrictive
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and nullif(btrim(u.phone), '') is not null
        and u.barangay_id is not null
    )
  );

drop policy if exists "Require completed profile to create listings" on public.listings;
create policy "Require completed profile to create listings"
  on public.listings
  as restrictive
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and nullif(btrim(u.phone), '') is not null
        and u.barangay_id is not null
    )
  );

drop policy if exists "Require completed profile for cart reads" on public.cart_items;
create policy "Require completed profile for cart reads"
  on public.cart_items
  as restrictive
  for select
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and nullif(btrim(u.phone), '') is not null
        and u.barangay_id is not null
    )
  );

drop policy if exists "Require completed profile for cart inserts" on public.cart_items;
create policy "Require completed profile for cart inserts"
  on public.cart_items
  as restrictive
  for insert
  to authenticated
  with check (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and nullif(btrim(u.phone), '') is not null
        and u.barangay_id is not null
    )
  );

drop policy if exists "Require completed profile for cart updates" on public.cart_items;
create policy "Require completed profile for cart updates"
  on public.cart_items
  as restrictive
  for update
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and nullif(btrim(u.phone), '') is not null
        and u.barangay_id is not null
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and nullif(btrim(u.phone), '') is not null
        and u.barangay_id is not null
    )
  );

drop policy if exists "Require completed profile for cart deletes" on public.cart_items;
create policy "Require completed profile for cart deletes"
  on public.cart_items
  as restrictive
  for delete
  to authenticated
  using (
    exists (
      select 1 from public.users u
      where u.id = (select auth.uid())
        and nullif(btrim(u.phone), '') is not null
        and u.barangay_id is not null
    )
  );

grant select on public.users to authenticated;
revoke insert, delete, update on public.users from anon, authenticated;
grant update (phone, barangay_id, display_name, avatar_url)
  on public.users to authenticated;

commit;
