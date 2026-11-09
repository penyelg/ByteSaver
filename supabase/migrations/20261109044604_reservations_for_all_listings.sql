begin;

alter table public.listings
  alter column reservation_contact_allowed set default true;

update public.listings
set reservation_contact_allowed = true
where not reservation_contact_allowed;

commit;
