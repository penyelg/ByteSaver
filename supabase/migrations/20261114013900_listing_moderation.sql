begin;

-- Preserve publication of existing listings and queue new submissions.
alter table public.listings
  add column moderation_status text not null default 'approved'
    check (moderation_status in ('pending', 'approved', 'rejected', 'hidden')),
  add column moderation_reason text,
  add column moderation_revision uuid not null default gen_random_uuid(),
  add column moderation_submitted_at timestamptz not null default now();
alter table public.listings alter column moderation_status set default 'pending';
create index listings_moderation_queue_idx on public.listings (moderation_status, moderation_submitted_at, id);

create table bytesaver_private.listing_moderation_history (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id) on delete cascade,
  revision uuid not null,
  status text not null check (status in ('approved', 'rejected', 'hidden')),
  reason text,
  reviewed_by uuid references public.users(id) on delete set null,
  reviewed_at timestamptz not null default clock_timestamp()
);
create index listing_moderation_history_listing_date_idx
  on bytesaver_private.listing_moderation_history (listing_id, reviewed_at desc);
create index listing_moderation_history_reviewer_idx
  on bytesaver_private.listing_moderation_history (reviewed_by);
alter table bytesaver_private.listing_moderation_history enable row level security;
revoke all on bytesaver_private.listing_moderation_history from public, anon, authenticated;

-- INSERT eligibility remains governed by the existing seller policies.
create policy "New listings enter moderation" on public.listings as restrictive
  for insert to public
  with check (moderation_status = 'pending' and moderation_reason is null);

create policy "Unapproved listings are visible to their seller" on public.listings as restrictive
  for select to public
  using (moderation_status = 'approved' or seller_id = (select auth.uid()));

alter policy "Active accounts access saved carts" on public.cart_items
  with check ((select bytesaver_private.is_verified()) and exists (
    select 1 from public.listings l where l.id = listing_id and l.moderation_status = 'approved'
  ));

create function bytesaver_private.queue_listing_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if (new.brand, new.model, new.category, new.category_id, new.price, new.condition,
      new.description, new.image_url, new.specs)
    is distinct from
     (old.brand, old.model, old.category, old.category_id, old.price, old.condition,
      old.description, old.image_url, old.specs) then
    new.moderation_status := 'pending';
    new.moderation_reason := null;
    new.moderation_revision := gen_random_uuid();
    new.moderation_submitted_at := clock_timestamp();
  end if;
  return new;
end;
$$;
revoke all on function bytesaver_private.queue_listing_revision() from public, anon, authenticated;

create trigger queue_listing_revision
before update of brand, model, category, category_id, price, condition, description, image_url, specs
on public.listings for each row execute function bytesaver_private.queue_listing_revision();

create or replace function public.browse_marketplace_listings()
returns setof public.listings language sql stable security invoker set search_path = '' as $$
  select l.* from public.listings l
  where l.moderation_status = 'approved' and not bytesaver_private.listing_hidden_from_marketplace(l.id);
$$;

create or replace function public.start_listing_reservation(
  p_id uuid, p_listing uuid, p_buyer uuid, p_price numeric, p_fee numeric, p_hold_minutes integer
) returns public.listing_reservations language plpgsql set search_path = '' as $$
declare
  listing public.listings;
  reservation public.listing_reservations;
begin
  select * into listing from public.listings where id = p_listing for update;
  if not found or listing.moderation_status <> 'approved' or listing.seller_id = p_buyer or not listing.reservation_contact_allowed
    or not bytesaver_private.reservation_eligible(p_buyer)
    or not bytesaver_private.reservation_eligible(listing.seller_id)
    or not exists (select 1 from public.users where id = listing.seller_id and phone ~ '^\+639[0-9]{9}$')
  then
    raise exception 'This listing cannot be reserved.';
  end if;

  update public.listing_reservations set status = 'expired'
    where listing_id = p_listing and status in ('pending', 'reserved') and expires_at <= clock_timestamp();
  select * into reservation from public.listing_reservations
    where listing_id = p_listing and status in ('pending', 'reserved', 'sold');
  if found then
    if reservation.status = 'pending' and reservation.buyer_id = p_buyer then
      return reservation;
    end if;
    raise exception 'This listing is already held or sold.';
  end if;

  if listing.price is null or listing.price <= 0 or listing.price <> p_price then
    raise exception 'The listing price changed. Refresh before reserving.';
  end if;

  insert into public.listing_reservations (id, listing_id, buyer_id, seller_id, item_name, item_price, fee, hold_minutes, expires_at)
  values (p_id, p_listing, p_buyer, listing.seller_id, concat_ws(' ', listing.brand, listing.model),
    listing.price, p_fee, p_hold_minutes, clock_timestamp() + interval '20 minutes')
  returning * into reservation;
  return reservation;
end;
$$;

create function bytesaver_private.admin_listing_queue(p_status text)
returns setof public.listings language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not bytesaver_private.is_administrator() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  return query select l.* from public.listings l where l.moderation_status = p_status;
end;
$$;

create function bytesaver_private.admin_listing_history(p_listing uuid)
returns table(id uuid, status text, reason text, reviewed_by uuid, reviewer_name text, reviewed_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null or not bytesaver_private.is_administrator() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  return query select h.id, h.status, h.reason, h.reviewed_by, u.full_name, h.reviewed_at
    from bytesaver_private.listing_moderation_history h
    left join public.users u on u.id = h.reviewed_by
    where h.listing_id = p_listing
    order by h.reviewed_at desc, h.id;
end;
$$;

create function bytesaver_private.admin_moderate_listing(
  p_listing uuid, p_revision uuid, p_expected_status text, p_status text, p_reason text
) returns void language plpgsql security definer set search_path = '' as $$
declare
  listing public.listings;
  reason text := nullif(btrim(p_reason), '');
begin
  if auth.uid() is null or not bytesaver_private.is_administrator() then
    raise exception 'Administrator access is required.' using errcode = '42501';
  end if;
  select * into listing from public.listings where id = p_listing for update;
  if not found or listing.moderation_revision is distinct from p_revision
    or listing.moderation_status is distinct from p_expected_status then
    raise exception 'This listing changed. Refresh the queue and review it again.';
  end if;
  if p_status is null or not (
    (p_status = 'approved' and listing.moderation_status in ('pending', 'rejected', 'hidden')) or
    (p_status = 'rejected' and listing.moderation_status = 'pending') or
    (p_status = 'hidden' and listing.moderation_status = 'approved')
  ) then
    raise exception 'That moderation decision is unavailable.';
  end if;
  if p_status in ('rejected', 'hidden') and coalesce(length(reason), 0) not between 3 and 1000 then
    raise exception 'Enter a reason between 3 and 1,000 characters.';
  end if;
  if p_status = 'approved' then reason := null; end if;

  update public.listings set moderation_status = p_status, moderation_reason = reason,
    moderation_revision = gen_random_uuid()
    where id = p_listing;
  insert into bytesaver_private.listing_moderation_history (listing_id, revision, status, reason, reviewed_by)
    values (p_listing, p_revision, p_status, reason, auth.uid());
end;
$$;

create function public.admin_listing_queue(p_status text)
returns setof public.listings language sql stable security invoker set search_path = '' as $$
  select * from bytesaver_private.admin_listing_queue(p_status);
$$;
create function public.admin_listing_history(p_listing uuid)
returns table(id uuid, status text, reason text, reviewed_by uuid, reviewer_name text, reviewed_at timestamptz)
language sql stable security invoker set search_path = '' as $$
  select * from bytesaver_private.admin_listing_history(p_listing);
$$;
create function public.admin_moderate_listing(
  p_listing uuid, p_revision uuid, p_expected_status text, p_status text, p_reason text
) returns void language sql security invoker set search_path = '' as $$
  select bytesaver_private.admin_moderate_listing(p_listing, p_revision, p_expected_status, p_status, p_reason);
$$;

revoke all on function
  bytesaver_private.admin_listing_queue(text), public.admin_listing_queue(text),
  bytesaver_private.admin_listing_history(uuid), public.admin_listing_history(uuid),
  bytesaver_private.admin_moderate_listing(uuid,uuid,text,text,text),
  public.admin_moderate_listing(uuid,uuid,text,text,text)
  from public, anon, authenticated;
grant execute on function
  bytesaver_private.admin_listing_queue(text), public.admin_listing_queue(text),
  bytesaver_private.admin_listing_history(uuid), public.admin_listing_history(uuid),
  bytesaver_private.admin_moderate_listing(uuid,uuid,text,text,text),
  public.admin_moderate_listing(uuid,uuid,text,text,text)
  to authenticated;

commit;
