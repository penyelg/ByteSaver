begin;

alter table public.listings add column reservation_contact_allowed boolean not null default false;

create table public.listing_reservations (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid not null references public.listings(id),
  buyer_id uuid not null references public.users(id),
  seller_id uuid not null references public.users(id),
  item_name text not null,
  item_price numeric(12,2) not null check (item_price > 0),
  fee numeric(12,2) not null check (fee > 0),
  hold_minutes integer not null check (hold_minutes > 0),
  status text not null default 'pending' check (
    status in ('pending', 'reserved', 'sold', 'expired', 'failed', 'payment_review')
  ),
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  paid_at timestamptz,
  xendit_session_id text unique,
  xendit_payment_id text unique,
  checkout_url text,
  check (buyer_id <> seller_id)
);
create unique index listing_reservations_one_hold on public.listing_reservations(listing_id)
  where status in ('pending', 'reserved', 'sold');
create index listing_reservations_buyer on public.listing_reservations(buyer_id, created_at desc);
create index listing_reservations_seller on public.listing_reservations(seller_id, created_at desc);
create index listing_reservations_listing on public.listing_reservations(listing_id);
alter table public.listing_reservations enable row level security;
revoke all on public.listing_reservations from public, anon, authenticated;
grant select, update on public.listing_reservations to service_role;
grant insert on public.listing_reservations to service_role;

grant usage on schema bytesaver_private to service_role;
grant select on bytesaver_private.account_access to service_role;

create function bytesaver_private.reservation_eligible(p_user uuid) returns boolean
language sql stable set search_path = '' as $$
  select exists (select 1 from public.identity_submissions where user_id = p_user and status = 'approved')
    and not exists (select 1 from bytesaver_private.account_access where user_id = p_user and status = 'suspended');
$$;

create function public.reservation_user_eligible(p_user uuid) returns boolean
language sql stable set search_path = '' as $$
  select bytesaver_private.reservation_eligible(p_user);
$$;
create function public.start_listing_reservation(
  p_id uuid, p_listing uuid, p_buyer uuid, p_price numeric, p_fee numeric, p_hold_minutes integer
) returns public.listing_reservations language plpgsql set search_path = '' as $$
declare
  listing public.listings;
  reservation public.listing_reservations;
begin
  select * into listing from public.listings where id = p_listing for update;
  if not found or listing.seller_id = p_buyer or not listing.reservation_contact_allowed
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

create function public.confirm_listing_reservation(
  p_id uuid, p_session text, p_payment text, p_fee numeric, p_currency text
) returns void language plpgsql set search_path = '' as $$
declare
  reservation public.listing_reservations;
begin
  select * into reservation from public.listing_reservations where id = p_id for update;
  if not found or reservation.xendit_session_id is distinct from p_session
    or reservation.fee is distinct from p_fee or p_currency is distinct from 'PHP'
    or nullif(p_payment, '') is null then
    raise exception 'Payment does not match a reservation.';
  end if;
  if reservation.xendit_payment_id = p_payment then return; end if;
  if reservation.xendit_payment_id is not null then raise exception 'Payment already recorded.'; end if;

  if reservation.status = 'pending' and reservation.expires_at > clock_timestamp()
    and bytesaver_private.reservation_eligible(reservation.buyer_id)
    and bytesaver_private.reservation_eligible(reservation.seller_id) then
    update public.listing_reservations
      set status = 'reserved', paid_at = clock_timestamp(), xendit_payment_id = p_payment,
        expires_at = clock_timestamp() + make_interval(mins => reservation.hold_minutes)
      where id = p_id;
  elsif reservation.status in ('pending', 'expired', 'failed') then
    update public.listing_reservations
      set status = 'payment_review', paid_at = clock_timestamp(), xendit_payment_id = p_payment where id = p_id;
  else
    raise exception 'Unexpected reservation status.';
  end if;
end;
$$;

create function public.list_my_listing_reservations(p_user uuid) returns jsonb
language sql stable set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'item_name', r.item_name, 'item_price', r.item_price, 'fee', r.fee,
    'expires_at', r.expires_at, 'is_seller', r.seller_id = p_user,
    'status', case when r.status in ('pending', 'reserved') and r.expires_at <= now() then 'expired' else r.status end,
    'checkout_url', case when r.buyer_id = p_user and r.status = 'pending' and r.expires_at > now() then r.checkout_url end,
    'seller_phone', case when r.buyer_id = p_user and r.status = 'reserved' and r.expires_at > now()
      and l.reservation_contact_allowed and bytesaver_private.reservation_eligible(r.seller_id)
      and u.phone ~ '^\+639[0-9]{9}$' then u.phone end
  ) order by r.created_at desc), '[]'::jsonb)
  from public.listing_reservations r
  join public.listings l on l.id = r.listing_id
  join public.users u on u.id = r.seller_id
  where (r.buyer_id = p_user or r.seller_id = p_user) and bytesaver_private.reservation_eligible(p_user);
$$;

create function public.finish_listing_reservation(p_id uuid, p_seller uuid) returns boolean
language sql set search_path = '' as $$
  with completed as (
    update public.listing_reservations set status = 'sold'
      where id = p_id and seller_id = p_seller and status = 'reserved' and expires_at > clock_timestamp()
        and bytesaver_private.reservation_eligible(p_seller) returning id
  )
  select exists (select 1 from completed);
$$;

revoke all on function bytesaver_private.reservation_eligible(uuid),
  public.start_listing_reservation(uuid,uuid,uuid,numeric,numeric,integer),
  public.confirm_listing_reservation(uuid,text,text,numeric,text),
  public.list_my_listing_reservations(uuid), public.finish_listing_reservation(uuid,uuid), public.reservation_user_eligible(uuid)
  from public, anon, authenticated;
grant execute on function bytesaver_private.reservation_eligible(uuid),
  public.start_listing_reservation(uuid,uuid,uuid,numeric,numeric,integer),
  public.confirm_listing_reservation(uuid,text,text,numeric,text),
  public.list_my_listing_reservations(uuid), public.finish_listing_reservation(uuid,uuid), public.reservation_user_eligible(uuid) to service_role;

commit;
