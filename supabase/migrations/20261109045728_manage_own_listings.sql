begin;

revoke update on public.listings from public, anon, authenticated;
grant update (brand, model, price, condition, description) on public.listings to authenticated;

create policy "Sellers update their own listings" on public.listings for update to authenticated
  using ((select auth.uid()) = seller_id)
  with check ((select auth.uid()) = seller_id);

create function bytesaver_private.prevent_edits_to_held_listing()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  -- The UPDATE locks the listing row, which checkout also locks before starting a hold.
  if exists (
    select 1 from public.listing_reservations r
    where r.listing_id = old.id
      and r.status in ('pending', 'reserved', 'sold')
      and (r.status = 'sold' or r.expires_at > clock_timestamp())
  ) then
    raise exception 'Listings with an active checkout, reservation, or completed sale cannot be edited.';
  end if;
  return new;
end;
$$;

revoke all on function bytesaver_private.prevent_edits_to_held_listing() from public, anon, authenticated;

create trigger protect_listing_during_reservation
before update of brand, model, price, condition, description on public.listings
for each row execute function bytesaver_private.prevent_edits_to_held_listing();

commit;
