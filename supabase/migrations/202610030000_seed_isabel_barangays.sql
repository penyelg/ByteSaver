-- Seed the official Isabel, Leyte barangay list before adding profile FKs.
-- PSGC codes are the stable identifiers; table rows are safe to upsert.

begin;

create table if not exists public.barangays (
  id uuid primary key default gen_random_uuid(),
  psgc_code text,
  name text not null,
  municipality text not null default 'Isabel',
  province text not null default 'Leyte',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  constraint barangays_name_location_unique unique (name, municipality, province)
);

alter table public.barangays
  add column if not exists psgc_code text;

create unique index if not exists barangays_psgc_code_key
  on public.barangays (psgc_code)
  where psgc_code is not null;

insert into public.barangays (psgc_code, name, municipality, province)
values
  ('0803722001', 'Anislag',       'Isabel', 'Leyte'),
  ('0803722002', 'Antipolo',      'Isabel', 'Leyte'),
  ('0803722003', 'Apale',         'Isabel', 'Leyte'),
  ('0803722004', 'Bantigue',      'Isabel', 'Leyte'),
  ('0803722005', 'Benog',         'Isabel', 'Leyte'),
  ('0803722006', 'Bilwang',       'Isabel', 'Leyte'),
  ('0803722007', 'Can-andan',     'Isabel', 'Leyte'),
  ('0803722008', 'Cangag',        'Isabel', 'Leyte'),
  ('0803722009', 'Consolacion',   'Isabel', 'Leyte'),
  ('0803722010', 'Honan',         'Isabel', 'Leyte'),
  ('0803722011', 'Libertad',      'Isabel', 'Leyte'),
  ('0803722012', 'Mahayag',       'Isabel', 'Leyte'),
  ('0803722013', 'Marvel',        'Isabel', 'Leyte'),
  ('0803722014', 'Matlang',       'Isabel', 'Leyte'),
  ('0803722015', 'Monte Alegre',  'Isabel', 'Leyte'),
  ('0803722017', 'Puting Bato',   'Isabel', 'Leyte'),
  ('0803722018', 'San Francisco', 'Isabel', 'Leyte'),
  ('0803722019', 'San Roque',     'Isabel', 'Leyte'),
  ('0803722020', 'Santa Cruz',    'Isabel', 'Leyte'),
  ('0803722021', 'Santo Niño',    'Isabel', 'Leyte'),
  ('0803722022', 'Santo Rosario', 'Isabel', 'Leyte'),
  ('0803722023', 'Tabunok',       'Isabel', 'Leyte'),
  ('0803722024', 'Tolingon',      'Isabel', 'Leyte'),
  ('0803722025', 'Tubod',         'Isabel', 'Leyte')
on conflict (psgc_code) where psgc_code is not null
do update set
  name = excluded.name,
  municipality = excluded.municipality,
  province = excluded.province,
  is_active = true;

alter table public.barangays enable row level security;

drop policy if exists "Active Isabel barangays are readable" on public.barangays;
create policy "Active Isabel barangays are readable"
  on public.barangays
  for select
  to anon, authenticated
  using (is_active);

grant select on public.barangays to anon, authenticated;
revoke insert, update, delete on public.barangays from anon, authenticated;

commit;
