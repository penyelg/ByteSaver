create or replace function bytesaver_private.prevent_edits_to_held_listing()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  reservation_status text;
  reservation_expires_at timestamptz;
begin
  -- Read the latest reservation state after any concurrent payment confirmation commits.
  select r.status, r.expires_at into reservation_status, reservation_expires_at
  from public.listing_reservations r
  where r.listing_id = old.id and r.status in ('pending', 'reserved', 'sold')
  for update;

  if found and (reservation_status = 'sold' or reservation_expires_at > clock_timestamp()) then
    raise exception 'Listings with an active checkout, reservation, or completed sale cannot be edited.';
  end if;
  return new;
end;
$$;
