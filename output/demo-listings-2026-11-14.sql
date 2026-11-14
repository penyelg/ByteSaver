-- Executed against ByteSaver sixrqythauiupgtimkbe at the user's request.
-- Idempotent demo seed, not a schema migration. Existing listings are not updated.
begin;
do $$
declare
  target_user uuid;
  target_barangay uuid;
  item record;
  source public.listings%rowtype;
  created public.listings%rowtype;
  seed_description constant text := 'DEMO LISTING — ByteSaver mobile catalog preview (2026-11-14). Sample data for interface testing, not an actual offer for sale. Photo and specifications reference an existing catalog item; price and condition are illustrative. Paid reservations are disabled.';
begin
  select u.id, p.barangay_id into strict target_user, target_barangay
    from auth.users u join public.users p on p.id=u.id
    where lower(u.email)='diacarlarpepito@gmail.com';
  perform pg_advisory_xact_lock(hashtextextended('bytesaver-demo-catalog-20261114-' || target_user::text, 0));
  for item in
    select * from (values
      (1, '41d69267-7e6d-4624-83a3-c858ac138a0b'::uuid, 4800::numeric, 'Good'),
      (2, 'a3a8f16f-dfcd-4126-9471-9057b41a9748'::uuid, 3300::numeric, 'Excellent'),
      (3, '5bb92478-0837-42d8-80a2-aa96ac2289a8'::uuid, 4500::numeric, 'Good'),
      (4, '18f01df6-8da2-44c1-a8bc-8f6815a70322'::uuid, 1300::numeric, 'Like new'),
      (5, '1e7886a0-2258-4331-8077-68f074a49285'::uuid, 135000::numeric, 'Excellent'),
      (6, 'f08ebcdc-5653-4058-a96b-34fbf286941e'::uuid, 1500::numeric, 'Good'),
      (7, 'e897bddf-89bb-48d6-abd4-2f61a2c7e8d0'::uuid, 2400::numeric, 'Excellent'),
      (8, '0d489344-fbcb-4b56-83dc-a5c5391a3d27'::uuid, 6500::numeric, 'Good'),
      (9, '6f79a699-9822-4f23-b4d7-99e7be62414b'::uuid, 125000::numeric, 'Good'),
      (10, '41d69267-7e6d-4624-83a3-c858ac138a0b'::uuid, 5200::numeric, 'Like new'),
      (11, '5bb92478-0837-42d8-80a2-aa96ac2289a8'::uuid, 5200::numeric, 'Excellent'),
      (12, '0d489344-fbcb-4b56-83dc-a5c5391a3d27'::uuid, 7000::numeric, 'Excellent')
    ) as seed(number,source_id,price,condition)
  loop
    select * into strict source from public.listings where id=item.source_id;
    if not exists (select 1 from public.categories where id=source.category_id and is_active) then
      raise exception 'Seed source has no active category';
    end if;
    if source.image_url is null then raise exception 'Seed source has no image'; end if;
    if exists (select 1 from public.listings where seller_id=target_user
       and description=seed_description
       and model=source.model || ' [Demo ' || lpad(item.number::text,2,'0') || ']') then
      continue;
    end if;
    insert into public.listings(seller_id,brand,model,category,category_id,barangay_id,price,condition,description,specs,image_url,reservation_contact_allowed,moderation_status)
      values(target_user,source.brand,source.model || ' [Demo ' || lpad(item.number::text,2,'0') || ']',
        source.category,source.category_id,target_barangay,item.price,item.condition,
        seed_description,source.specs,source.image_url,false,'approved')
      returning * into created;
    insert into bytesaver_private.listing_moderation_history(listing_id,revision,status,reason,reviewed_by)
      values(created.id,created.moderation_revision,'approved',
        'Demo data approved through the database at the project owner request. No administrator account impersonated. Batch: mobile catalog preview 2026-11-14.',null);
  end loop;
  if (select count(*) from public.listings where seller_id=target_user and description=seed_description and moderation_status='approved' and reservation_contact_allowed=false) <> 12 then
    raise exception 'Expected exactly 12 approved demo listings; rolling back';
  end if;
end $$;
commit;
select l.id,l.brand,l.model,l.category,l.price,l.moderation_status,l.reservation_contact_allowed
from public.listings l join auth.users u on u.id=l.seller_id
where lower(u.email)='diacarlarpepito@gmail.com'
and l.description like 'DEMO LISTING — ByteSaver mobile catalog preview (2026-11-14).%'
order by l.model;
