-- ════════════════════════════════════════════════════════════════════
--  Salon Janika — database schema + seed
--  Run this in the Supabase SQL editor (or `supabase db push`).
--  Creates: bookings, site_content, prices, gallery
--  Sets up: Row Level Security + policies
--  Seeds:   default Finnish content + the full price list
-- ════════════════════════════════════════════════════════════════════

-- ── Extensions ──────────────────────────────────────────────────────
create extension if not exists "pgcrypto"; -- for gen_random_uuid()

-- ════════════════════════════════════════════════════════════════════
--  1. BOOKINGS  (request-based reservations)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.bookings (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),
  status          text not null default 'pending'
                    check (status in ('pending', 'confirmed', 'declined')),
  customer_name   text not null,
  customer_phone  text not null,
  customer_email  text,
  service         text not null,
  preferred_date  date,
  preferred_time  text,
  message         text,
  consent_given   boolean not null default false,
  admin_note      text
);

comment on table public.bookings is 'Customer booking requests; managed by the owner in /admin.';
create index if not exists bookings_status_created_idx
  on public.bookings (status, created_at desc);

-- ════════════════════════════════════════════════════════════════════
--  2. SITE_CONTENT  (structured key/value editable copy)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.site_content (
  key         text primary key,
  value       text not null default '',
  label       text not null default '',  -- human label shown in admin
  updated_at  timestamptz not null default now()
);

comment on table public.site_content is 'Editable page texts, hours, phone, address.';

-- ════════════════════════════════════════════════════════════════════
--  3. PRICES  (editable price list rows)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.prices (
  id              uuid primary key default gen_random_uuid(),
  category        text not null,
  category_order  int  not null default 0,
  name            text not null,
  price           numeric(7,2),          -- nullable for "from"/note rows
  price_suffix    text not null default '€',
  sort_order      int  not null default 0,
  updated_at      timestamptz not null default now()
);

comment on table public.prices is 'Editable price list; grouped by category.';
create index if not exists prices_order_idx
  on public.prices (category_order, sort_order);

-- ════════════════════════════════════════════════════════════════════
--  4. GALLERY  (Supabase Storage image references)
-- ════════════════════════════════════════════════════════════════════
create table if not exists public.gallery (
  id          uuid primary key default gen_random_uuid(),
  storage_path text not null,            -- path inside the 'gallery' bucket
  alt         text not null default '',
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

comment on table public.gallery is 'Gallery images stored in the public "gallery" Storage bucket.';

-- ════════════════════════════════════════════════════════════════════
--  ROW LEVEL SECURITY
--  Principle: the public (anon) role can INSERT booking requests and
--  READ public content only. All other writes require an authenticated
--  admin. Privileged server endpoints use the service-role key, which
--  bypasses RLS entirely — so these policies are defence-in-depth.
-- ════════════════════════════════════════════════════════════════════
alter table public.bookings     enable row level security;
alter table public.site_content enable row level security;
alter table public.prices       enable row level security;
alter table public.gallery      enable row level security;

-- Drop existing policies so this script is idempotent ----------------
drop policy if exists "bookings_public_insert"   on public.bookings;
drop policy if exists "bookings_admin_select"     on public.bookings;
drop policy if exists "bookings_admin_update"     on public.bookings;
drop policy if exists "bookings_admin_delete"     on public.bookings;
drop policy if exists "content_public_select"     on public.site_content;
drop policy if exists "content_admin_write"       on public.site_content;
drop policy if exists "prices_public_select"      on public.prices;
drop policy if exists "prices_admin_write"        on public.prices;
drop policy if exists "gallery_public_select"     on public.gallery;
drop policy if exists "gallery_admin_write"       on public.gallery;

-- BOOKINGS ----------------------------------------------------------
-- Anyone may submit a request, but only a 'pending' row with consent.
create policy "bookings_public_insert" on public.bookings
  for insert to anon, authenticated
  with check (status = 'pending' and consent_given = true);

-- Only authenticated admins may read / change / delete.
create policy "bookings_admin_select" on public.bookings
  for select to authenticated using (true);
create policy "bookings_admin_update" on public.bookings
  for update to authenticated using (true) with check (true);
create policy "bookings_admin_delete" on public.bookings
  for delete to authenticated using (true);

-- PUBLIC CONTENT (read-only to everyone, write to admins) ------------
create policy "content_public_select" on public.site_content
  for select to anon, authenticated using (true);
create policy "content_admin_write" on public.site_content
  for all to authenticated using (true) with check (true);

create policy "prices_public_select" on public.prices
  for select to anon, authenticated using (true);
create policy "prices_admin_write" on public.prices
  for all to authenticated using (true) with check (true);

create policy "gallery_public_select" on public.gallery
  for select to anon, authenticated using (true);
create policy "gallery_admin_write" on public.gallery
  for all to authenticated using (true) with check (true);

-- ════════════════════════════════════════════════════════════════════
--  STORAGE: public "gallery" bucket
--  (Create the bucket in the dashboard, or it is created on first
--   upload by the admin endpoint. Public read so <img> works.)
-- ════════════════════════════════════════════════════════════════════
insert into storage.buckets (id, name, public)
values ('gallery', 'gallery', true)
on conflict (id) do nothing;

drop policy if exists "gallery_storage_public_read" on storage.objects;
create policy "gallery_storage_public_read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'gallery');

-- ════════════════════════════════════════════════════════════════════
--  SEED: default site content (verbatim Finnish copy)
-- ════════════════════════════════════════════════════════════════════
insert into public.site_content (key, value, label) values
  ('hero_tagline',
   'Koko perheen parturi-kampaamo Espoon Matinkylässä.',
   'Etusivu: hero-tagline'),
  ('etusivu_body',
   'Salon Janika on koko perheen parturi-kampaamo. Palvelen teitä rauhallisessa ja ystävällisessä ilmapiirissä Espoon Matinkylässä. Asiakkaan viihtyvyys ja tyytyväisyys on minulle tärkeä.',
   'Etusivu: esittelyteksti'),
  ('contact_welcome', 'Tervetuloa!', 'Etusivu: tervetuloa-teksti'),
  ('hinnasto_lead',
   'Käytän väreissä ja kiharoissa laadukkaita Wella-aineita.',
   'Hinnasto: johdantolause'),
  ('hinnasto_perm_note',
   'Väri ja permanentti ilman leikkausta –20 %',
   'Hinnasto: permanentti-huomautus'),
  ('hinnasto_footnote_1',
   'Hintoihin voidaan lisätä työ-/ainelisä (20 €) mikäli hiukset ovat erittäin pitkät tai paksut.',
   'Hinnasto: alaviite 1'),
  ('hinnasto_footnote_2',
   'Hinnat sis. ALV 25,5 %.',
   'Hinnasto: alaviite 2'),
  ('open_weekday', 'Avoinna MA–PE 10–18', 'Aukiolo: arkipäivät'),
  ('open_saturday', 'LA sopimuksen mukaan.', 'Aukiolo: lauantai'),
  ('yhteystiedot_location',
   'Parturi-kampaamo sijaitsee Espoon Matinkylässä.',
   'Yhteystiedot: sijaintiteksti'),
  ('ajanvaraus_intro',
   'Jätä varauspyyntö alla olevalla lomakkeella. Vahvistan ajan sinulle pian henkilökohtaisesti.',
   'Ajanvaraus: johdantoteksti'),
  ('footer_hours',
   'ark. 10–18, la sopimuksen mukaan',
   'Footer: aukiolo'),
  ('phone', '09 855 2757', 'Puhelinnumero (linkki)'),
  ('phone_display', '09-855 2757', 'Puhelinnumero (näytettävä)'),
  ('address_street', 'Mirjankuja 2', 'Osoite: katuosoite'),
  ('address_postal', '02230 Espoo, Matinkylä', 'Osoite: postinumero ja kaupunki'),
  ('address_area', 'Matinkylä', 'Osoite: kaupunginosa'),
  ('city', 'Espoo', 'Kaupunki')
on conflict (key) do nothing;

-- ════════════════════════════════════════════════════════════════════
--  SEED: full price list
-- ════════════════════════════════════════════════════════════════════
insert into public.prices (category, category_order, name, price, sort_order) values
  -- PARTURI
  ('PARTURI', 1, 'Leikkaus', 38, 1),
  ('PARTURI', 1, 'Leikkaus + pesu', 43, 2),
  ('PARTURI', 1, 'Koneleikkaus', 23, 3),
  ('PARTURI', 1, 'Niskan ja hiusrajojen siistiminen', 28, 4),
  -- KAMPAAMO
  ('KAMPAAMO', 2, 'Leikkaus', 58, 1),
  ('KAMPAAMO', 2, 'Leikkaus + pesu', 66, 2),
  ('KAMPAAMO', 2, 'Mallinmuutosleikkaus (sis. pesun)', 76, 3),
  ('KAMPAAMO', 2, 'Otsantukan leikkaus', 21, 4),
  ('KAMPAAMO', 2, 'Lapset alle 7 v hiusten leikkaus', 33, 5),
  ('KAMPAAMO', 2, 'Föönikampaus', 51, 6),
  ('KAMPAAMO', 2, 'Rullakampaus', 71, 7),
  -- VÄRIKÄSITTELY (+leikkaus)
  ('VÄRIKÄSITTELY (+leikkaus)', 3, 'Tyviväri (2 cm)', 122, 1),
  ('VÄRIKÄSITTELY (+leikkaus)', 3, 'Lyhyet', 137, 2),
  ('VÄRIKÄSITTELY (+leikkaus)', 3, 'Puolipitkät', 147, 3),
  ('VÄRIKÄSITTELY (+leikkaus)', 3, 'Pitkät', 171, 4),
  -- MONIVÄRI (+leikkaus)
  ('MONIVÄRI (+leikkaus)', 4, 'Lyhyet', 147, 1),
  ('MONIVÄRI (+leikkaus)', 4, 'Puolipitkät', 157, 2),
  ('MONIVÄRI (+leikkaus)', 4, 'Pitkät', 177, 3),
  -- PERMANENTTI (+leikkaus)
  ('PERMANENTTI (+leikkaus)', 5, 'Osapermanentti', 127, 1),
  ('PERMANENTTI (+leikkaus)', 5, 'Lyhyet', 133, 2),
  ('PERMANENTTI (+leikkaus)', 5, 'Puolipitkät', 149, 3),
  ('PERMANENTTI (+leikkaus)', 5, 'Pitkät', 170, 4),
  -- OLAPLEX (väri- tai permanenttikäsittelyn yhteydessä)
  ('OLAPLEX (väri- tai permanenttikäsittelyn yhteydessä)', 6, 'Lyhyet', 25, 1),
  ('OLAPLEX (väri- tai permanenttikäsittelyn yhteydessä)', 6, 'Puolipitkät', 30, 2),
  ('OLAPLEX (väri- tai permanenttikäsittelyn yhteydessä)', 6, 'Pitkät', 35, 3),
  -- OLAPLEX (leikkauksen yhteydessä)
  ('OLAPLEX (leikkauksen yhteydessä)', 7, 'Lyhyet', 32, 1),
  ('OLAPLEX (leikkauksen yhteydessä)', 7, 'Puolipitkät', 39, 2),
  ('OLAPLEX (leikkauksen yhteydessä)', 7, 'Pitkät', 49, 3),
  -- OLAPLEX-hoito + föönaus
  ('OLAPLEX-hoito + föönaus', 8, 'Lyhyet', 69, 1),
  ('OLAPLEX-hoito + föönaus', 8, 'Puolipitkät', 79, 2),
  ('OLAPLEX-hoito + föönaus', 8, 'Pitkät', 89, 3)
on conflict do nothing;

-- ════════════════════════════════════════════════════════════════════
--  DATA RETENTION helper
--  Deletes declined / old requests past a retention window.
--  Default: 6 months. Call from the admin endpoint or a scheduled job:
--    select public.purge_old_bookings(180);
-- ════════════════════════════════════════════════════════════════════
create or replace function public.purge_old_bookings(retention_days int default 180)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.bookings
  where created_at < now() - make_interval(days => retention_days)
    and status in ('declined', 'confirmed');
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- Done.
