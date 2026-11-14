-- Synthetic fixtures and payment events. Run after applying all migrations.
begin;
do $$
declare
  seller uuid := gen_random_uuid();
  buyer uuid := gen_random_uuid();
  outsider uuid := gen_random_uuid();
  hold uuid := gen_random_uuid();
  listing uuid;
  listing_revision uuid;
  barangay uuid;
  member uuid;
  state jsonb;
begin
  select id into barangay from public.barangays where is_active limit 1;
  if barangay is null then raise exception 'An active test barangay is required.'; end if;
  foreach member in array array[seller, buyer, outsider] loop
    insert into auth.users(id, email, raw_user_meta_data)
      values (member, member::text || '@reservation-test.invalid', '{}'::jsonb);
    update public.users set phone = '+639123456789', barangay_id = barangay where id = member;
    insert into public.identity_submissions(user_id, full_name, address, phone, barangay_id, id_type,
      document_path, status, reviewed_by, reviewed_at)
    values (member, 'Test Member', 'Test Street', '+639123456789', barangay, 'Passport',
      member::text || '/synthetic.jpg', 'approved', seller, now());
  end loop;
  insert into bytesaver_private.administrators(user_id) values (outsider);
  insert into public.listings(seller_id, brand, model, category, price, condition)
    values (seller, 'Test', 'GPU', 'GPU', 10000, 'Good') returning id, moderation_revision into listing, listing_revision;

  if has_table_privilege('authenticated', 'public.listing_reservations', 'select')
    or has_function_privilege('authenticated', 'public.list_my_listing_reservations(uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.confirm_listing_reservation(uuid,text,text,numeric,text)', 'execute') then
    raise exception 'Client can access privileged reservation data or confirm a payment.';
  end if;

  perform set_config('request.jwt.claim.sub', outsider::text, true);
  set local role authenticated;
  update public.listings set description = 'Unauthorized edit' where id = listing;
  if found then raise exception 'A different user edited the listing.'; end if;
  reset role;

  perform set_config('request.jwt.claim.sub', seller::text, true);
  set local role authenticated;
  begin
    perform public.admin_moderate_listing(listing, listing_revision, 'pending', 'approved', null);
    raise exception 'Seller bypassed moderation.';
  exception when insufficient_privilege then null;
  end;
  update public.listings set description = 'Seller edit' where id = listing;
  if not found then raise exception 'Seller could not edit their own listing.'; end if;
  reset role;

  perform set_config('request.jwt.claim.sub', buyer::text, true);
  set local role authenticated;
  if exists (select 1 from public.listings where id = listing)
    or exists (select 1 from public.browse_marketplace_listings() where id = listing) then
    raise exception 'Buyer can see a pending listing.';
  end if;
  set local role service_role;
  begin
    perform public.start_listing_reservation(hold, listing, buyer, 10000, 100, 1440);
    raise exception 'Buyer can reserve a pending listing.';
  exception when raise_exception then
    if sqlerrm <> 'This listing cannot be reserved.' then raise; end if;
  end;
  reset role;

  perform set_config('request.jwt.claim.sub', outsider::text, true);
  set local role authenticated;
  begin
    perform public.admin_moderate_listing(listing, listing_revision, 'pending', 'approved', null);
    raise exception 'Admin approved a stale listing revision.';
  exception when raise_exception then
    if sqlerrm <> 'This listing changed. Refresh the queue and review it again.' then raise; end if;
  end;
  select moderation_revision into listing_revision from public.admin_listing_queue('pending') where id = listing;
  perform public.admin_moderate_listing(listing, listing_revision, 'pending', 'rejected', 'Test rejection reason');
  if not exists (select 1 from public.admin_listing_history(listing)
    where status = 'rejected' and reviewed_by = outsider and reason = 'Test rejection reason') then
    raise exception 'Moderation decision was not audited.';
  end if;
  select moderation_revision into listing_revision from public.admin_listing_queue('rejected') where id = listing;
  perform public.admin_moderate_listing(listing, listing_revision, 'rejected', 'approved', null);
  perform set_config('request.jwt.claim.sub', seller::text, true);
  update public.listings set description = 'Revised after approval' where id = listing;
  if not exists (select 1 from public.listings where id = listing and moderation_status = 'pending')
    or exists (select 1 from public.browse_marketplace_listings() where id = listing) then
    raise exception 'An approved listing edit did not return to review.';
  end if;
  perform set_config('request.jwt.claim.sub', outsider::text, true);
  select moderation_revision into listing_revision from public.admin_listing_queue('pending') where id = listing;
  perform public.admin_moderate_listing(listing, listing_revision, 'pending', 'approved', null);
  select moderation_revision into listing_revision from public.admin_listing_queue('approved') where id = listing;
  perform public.admin_moderate_listing(listing, listing_revision, 'approved', 'hidden', 'Test hide reason');
  if exists (select 1 from public.browse_marketplace_listings() where id = listing) then
    raise exception 'Hidden listing still appears in the marketplace.';
  end if;
  select moderation_revision into listing_revision from public.admin_listing_queue('hidden') where id = listing;
  perform public.admin_moderate_listing(listing, listing_revision, 'hidden', 'approved', null);
  reset role;

  set local role service_role;
  perform public.start_listing_reservation(hold, listing, buyer, 10000, 100, 1440);
  if (public.start_listing_reservation(gen_random_uuid(), listing, buyer, 10000, 100, 1440)).id <> hold then
    raise exception 'Retry created a second hold.';
  end if;
  begin
    perform public.start_listing_reservation(gen_random_uuid(), listing, outsider, 10000, 100, 1440);
    raise exception 'Second buyer held the same item.';
  exception when raise_exception then
    if sqlerrm <> 'This listing is already held or sold.' then raise; end if;
  end;
  if public.list_my_listing_reservations(buyer)->0->>'seller_phone' is not null then
    raise exception 'Pending buyer can see the seller phone.';
  end if;
  reset role;
  perform set_config('request.jwt.claim.sub', buyer::text, true);
  set local role authenticated;
  if not exists (select 1 from public.browse_marketplace_listings() where id = listing) then
    raise exception 'A pending checkout hides the listing before payment.';
  end if;
  set local role service_role;
  update public.listing_reservations set xendit_session_id = 'test-session' where id = hold;
  begin
    perform public.confirm_listing_reservation(hold, 'test-session', 'test-payment', 1, 'PHP');
    raise exception 'Incorrect amount accepted.';
  exception when raise_exception then
    if sqlerrm <> 'Payment does not match a reservation.' then raise; end if;
  end;
  perform public.confirm_listing_reservation(hold, 'test-session', 'test-payment', 100, 'PHP');
  state := public.list_my_listing_reservations(buyer)->0;
  perform public.confirm_listing_reservation(hold, 'test-session', 'test-payment', 100, 'PHP');
  if state->>'status' is distinct from 'reserved' or state->>'seller_phone' is distinct from '+639123456789'
    or state is distinct from public.list_my_listing_reservations(buyer)->0
    or public.list_my_listing_reservations(outsider) <> '[]'::jsonb then
    raise exception 'Payment confirmation, retry, or phone isolation failed.';
  end if;
  if public.finish_listing_reservation(hold, buyer) then raise exception 'Buyer marked listing sold.'; end if;

  reset role;
  perform set_config('request.jwt.claim.sub', seller::text, true);
  set local role authenticated;
  begin
    update public.listings set price = 12000 where id = listing;
    raise exception 'Seller edited a reserved listing.';
  exception when raise_exception then
    if sqlerrm not like 'Listings with an active checkout%' then raise; end if;
  end;
  reset role;
  perform set_config('request.jwt.claim.sub', buyer::text, true);

  set local role authenticated;
  if exists (select 1 from public.browse_marketplace_listings() where id = listing)
    or not exists (select 1 from public.listings where id = listing) then
    raise exception 'Active reservation visibility is incorrect.';
  end if;
  set local role service_role;

  update public.listing_reservations set expires_at = now() - interval '1 minute' where id = hold;
  state := public.list_my_listing_reservations(buyer)->0;
  if state->>'status' is distinct from 'expired' or state->>'seller_phone' is not null then
    raise exception 'Expired reservation still shows seller contact.';
  end if;
  set local role authenticated;
  if not exists (select 1 from public.browse_marketplace_listings() where id = listing) then
    raise exception 'Expired reservation still hides the listing.';
  end if;
  set local role service_role;

  hold := gen_random_uuid();
  perform public.start_listing_reservation(hold, listing, outsider, 10000, 100, 1440);
  update public.listing_reservations set xendit_session_id = 'test-session-2' where id = hold;
  perform public.confirm_listing_reservation(hold, 'test-session-2', 'test-payment-2', 100, 'PHP');
  if not public.finish_listing_reservation(hold, seller) then raise exception 'Seller could not complete sale.'; end if;
  set local role authenticated;
  if exists (select 1 from public.browse_marketplace_listings() where id = listing) then
    raise exception 'Sold listing still appears in the marketplace.';
  end if;
  set local role service_role;
  begin
    perform public.start_listing_reservation(gen_random_uuid(), listing, buyer, 10000, 100, 1440);
    raise exception 'Sold listing can be reserved.';
  exception when raise_exception then
    if sqlerrm <> 'This listing is already held or sold.' then raise; end if;
  end;
end;
$$;
rollback;
