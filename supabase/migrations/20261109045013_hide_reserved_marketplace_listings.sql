begin;

create function bytesaver_private.listing_hidden_from_marketplace(p_listing uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select auth.uid() is not null and exists (
    select 1 from public.listing_reservations r
    where r.listing_id = p_listing
      and r.status in ('reserved', 'sold')
      and (r.status = 'sold' or r.expires_at > now())
  );
$$;

create function public.browse_marketplace_listings()
returns setof public.listings language sql stable security invoker set search_path = '' as $$
  select l.* from public.listings l
  where not bytesaver_private.listing_hidden_from_marketplace(l.id);
$$;

revoke all on function bytesaver_private.listing_hidden_from_marketplace(uuid),
  public.browse_marketplace_listings() from public, anon, authenticated;
grant execute on function bytesaver_private.listing_hidden_from_marketplace(uuid),
  public.browse_marketplace_listings() to authenticated;

commit;
