-- Categories drive the sell-form fields. Listing-specific values remain in
-- listings.specs (jsonb), keyed by category_specifications.spec_key.

begin;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.category_specifications (
  id uuid primary key default gen_random_uuid(),
  category_id uuid not null references public.categories(id) on delete cascade,
  spec_key text not null,
  label text not null,
  input_type text not null default 'text'
    check (input_type in ('text', 'number', 'select')),
  is_required boolean not null default true,
  options jsonb,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint category_specifications_category_key_unique unique (category_id, spec_key),
  constraint category_specifications_select_options_check
    check (input_type <> 'select' or jsonb_typeof(options) = 'array')
);

insert into public.categories (name, slug)
values
  ('CPU', 'cpu'),
  ('GPU', 'gpu'),
  ('RAM', 'ram'),
  ('Motherboard', 'motherboard'),
  ('Storage', 'storage'),
  ('Power Supply', 'power-supply'),
  ('Monitor', 'monitor'),
  ('Peripherals', 'peripherals')
on conflict (name) do update set is_active = true;

-- Preserve any extra category names already used by existing listings.
insert into public.categories (name, slug)
select distinct
  trim(l.category),
  trim(both '-' from regexp_replace(lower(trim(l.category)), '[^a-z0-9]+', '-', 'g'))
    || '-' || substr(md5(trim(l.category)), 1, 6)
from public.listings l
where l.category is not null and trim(l.category) <> ''
on conflict (name) do nothing;

insert into public.category_specifications
  (category_id, spec_key, label, input_type, is_required, sort_order)
select c.id, spec.spec_key, spec.label, spec.input_type, true, spec.sort_order
from (values
  ('CPU', 'socket', 'Socket', 'text', 1),
  ('CPU', 'cores', 'Cores', 'number', 2),
  ('CPU', 'threads', 'Threads', 'number', 3),
  ('GPU', 'vram', 'VRAM', 'text', 1),
  ('GPU', 'memory_type', 'Memory type', 'text', 2),
  ('GPU', 'power_requirement', 'Power requirement', 'text', 3),
  ('RAM', 'capacity', 'Capacity', 'text', 1),
  ('RAM', 'generation', 'Generation', 'text', 2),
  ('RAM', 'speed', 'Speed', 'text', 3),
  ('Motherboard', 'socket', 'Socket', 'text', 1),
  ('Motherboard', 'chipset', 'Chipset', 'text', 2),
  ('Motherboard', 'form_factor', 'Form factor', 'text', 3),
  ('Storage', 'capacity', 'Capacity', 'text', 1),
  ('Storage', 'storage_type', 'Type', 'text', 2),
  ('Storage', 'interface', 'Interface', 'text', 3),
  ('Power Supply', 'wattage', 'Wattage', 'text', 1),
  ('Power Supply', 'efficiency', 'Efficiency rating', 'text', 2),
  ('Power Supply', 'modular', 'Modular type', 'text', 3),
  ('Monitor', 'screen_size', 'Screen size', 'text', 1),
  ('Monitor', 'resolution', 'Resolution', 'text', 2),
  ('Monitor', 'refresh_rate', 'Refresh rate', 'text', 3),
  ('Peripherals', 'connection', 'Connection type', 'text', 1),
  ('Peripherals', 'compatibility', 'Compatibility', 'text', 2),
  ('Peripherals', 'included', 'Included accessories', 'text', 3)
) as spec(category_name, spec_key, label, input_type, sort_order)
join public.categories c on c.name = spec.category_name
on conflict (category_id, spec_key) do update set
  label = excluded.label,
  input_type = excluded.input_type,
  is_required = excluded.is_required,
  sort_order = excluded.sort_order;

alter table public.listings
  add column if not exists category_id uuid;

update public.listings l
set category_id = c.id
from public.categories c
where l.category_id is null
  and trim(l.category) = c.name;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'listings_category_id_fkey'
      and conrelid = 'public.listings'::regclass
  ) then
    alter table public.listings
      add constraint listings_category_id_fkey
      foreign key (category_id) references public.categories(id)
      on delete restrict;
  end if;
end
$$;

create index if not exists listings_category_id_idx
  on public.listings (category_id);

alter table public.categories enable row level security;
alter table public.category_specifications enable row level security;

drop policy if exists "Active categories are readable" on public.categories;
create policy "Active categories are readable"
  on public.categories
  for select
  to anon, authenticated
  using (is_active);

drop policy if exists "Specs for active categories are readable" on public.category_specifications;
create policy "Specs for active categories are readable"
  on public.category_specifications
  for select
  to anon, authenticated
  using (
    exists (
      select 1 from public.categories c
      where c.id = category_specifications.category_id and c.is_active
    )
  );

grant select on public.categories, public.category_specifications to anon, authenticated;
revoke insert, update, delete on public.categories, public.category_specifications
  from anon, authenticated;

commit;
