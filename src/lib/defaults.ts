/**
 * Seeded default content — the verbatim Finnish copy and full price list.
 *
 * These mirror `supabase/schema.sql` exactly. The public pages read live
 * content from Supabase when configured; when it is not (e.g. local
 * `npm run dev` before setup), the site renders these defaults so the
 * design is always previewable.
 */

export type ContentKey =
  | 'hero_tagline'
  | 'etusivu_body'
  | 'contact_welcome'
  | 'hinnasto_lead'
  | 'hinnasto_perm_note'
  | 'hinnasto_footnote_1'
  | 'hinnasto_footnote_2'
  | 'open_weekday'
  | 'open_saturday'
  | 'yhteystiedot_location'
  | 'ajanvaraus_intro'
  | 'footer_hours'
  | 'phone'
  | 'phone_display'
  | 'address_street'
  | 'address_postal'
  | 'address_area'
  | 'city';

export const DEFAULT_CONTENT: Record<ContentKey, string> = {
  hero_tagline: 'Koko perheen parturi-kampaamo Espoon Matinkylässä.',
  etusivu_body:
    'Salon Janika on koko perheen parturi-kampaamo. Palvelen teitä rauhallisessa ja ystävällisessä ilmapiirissä Espoon Matinkylässä. Asiakkaan viihtyvyys ja tyytyväisyys on minulle tärkeä.',
  contact_welcome: 'Tervetuloa!',
  hinnasto_lead: 'Käytän väreissä ja kiharoissa laadukkaita Wella-aineita.',
  hinnasto_perm_note: 'Väri ja permanentti ilman leikkausta –20 %',
  hinnasto_footnote_1:
    'Hintoihin voidaan lisätä työ-/ainelisä (20 €) mikäli hiukset ovat erittäin pitkät tai paksut.',
  hinnasto_footnote_2: 'Hinnat sis. ALV 25,5 %.',
  open_weekday: 'Avoinna MA–PE 10–18',
  open_saturday: 'LA sopimuksen mukaan.',
  yhteystiedot_location: 'Parturi-kampaamo sijaitsee Espoon Matinkylässä.',
  ajanvaraus_intro:
    'Jätä varauspyyntö alla olevalla lomakkeella. Vahvistan ajan sinulle pian henkilökohtaisesti.',
  footer_hours: 'ark. 10–18, la sopimuksen mukaan',
  phone: '09 855 2757',
  phone_display: '09-855 2757',
  address_street: 'Mirjankuja 2',
  address_postal: '02230 Espoo, Matinkylä',
  address_area: 'Matinkylä',
  city: 'Espoo',
};

export interface PriceRow {
  category: string;
  category_order: number;
  name: string;
  price: number | null;
  price_suffix?: string;
  sort_order: number;
}

export const DEFAULT_PRICES: PriceRow[] = [
  // PARTURI
  { category: 'PARTURI', category_order: 1, name: 'Leikkaus', price: 38, sort_order: 1 },
  { category: 'PARTURI', category_order: 1, name: 'Leikkaus + pesu', price: 43, sort_order: 2 },
  { category: 'PARTURI', category_order: 1, name: 'Koneleikkaus', price: 23, sort_order: 3 },
  { category: 'PARTURI', category_order: 1, name: 'Niskan ja hiusrajojen siistiminen', price: 28, sort_order: 4 },
  // KAMPAAMO
  { category: 'KAMPAAMO', category_order: 2, name: 'Leikkaus', price: 58, sort_order: 1 },
  { category: 'KAMPAAMO', category_order: 2, name: 'Leikkaus + pesu', price: 66, sort_order: 2 },
  { category: 'KAMPAAMO', category_order: 2, name: 'Mallinmuutosleikkaus (sis. pesun)', price: 76, sort_order: 3 },
  { category: 'KAMPAAMO', category_order: 2, name: 'Otsantukan leikkaus', price: 21, sort_order: 4 },
  { category: 'KAMPAAMO', category_order: 2, name: 'Lapset alle 7 v hiusten leikkaus', price: 33, sort_order: 5 },
  { category: 'KAMPAAMO', category_order: 2, name: 'Föönikampaus', price: 51, sort_order: 6 },
  { category: 'KAMPAAMO', category_order: 2, name: 'Rullakampaus', price: 71, sort_order: 7 },
  // VÄRIKÄSITTELY (+leikkaus)
  { category: 'VÄRIKÄSITTELY (+leikkaus)', category_order: 3, name: 'Tyviväri (2 cm)', price: 122, sort_order: 1 },
  { category: 'VÄRIKÄSITTELY (+leikkaus)', category_order: 3, name: 'Lyhyet', price: 137, sort_order: 2 },
  { category: 'VÄRIKÄSITTELY (+leikkaus)', category_order: 3, name: 'Puolipitkät', price: 147, sort_order: 3 },
  { category: 'VÄRIKÄSITTELY (+leikkaus)', category_order: 3, name: 'Pitkät', price: 171, sort_order: 4 },
  // MONIVÄRI (+leikkaus)
  { category: 'MONIVÄRI (+leikkaus)', category_order: 4, name: 'Lyhyet', price: 147, sort_order: 1 },
  { category: 'MONIVÄRI (+leikkaus)', category_order: 4, name: 'Puolipitkät', price: 157, sort_order: 2 },
  { category: 'MONIVÄRI (+leikkaus)', category_order: 4, name: 'Pitkät', price: 177, sort_order: 3 },
  // PERMANENTTI (+leikkaus)
  { category: 'PERMANENTTI (+leikkaus)', category_order: 5, name: 'Osapermanentti', price: 127, sort_order: 1 },
  { category: 'PERMANENTTI (+leikkaus)', category_order: 5, name: 'Lyhyet', price: 133, sort_order: 2 },
  { category: 'PERMANENTTI (+leikkaus)', category_order: 5, name: 'Puolipitkät', price: 149, sort_order: 3 },
  { category: 'PERMANENTTI (+leikkaus)', category_order: 5, name: 'Pitkät', price: 170, sort_order: 4 },
  // OLAPLEX (väri- tai permanenttikäsittelyn yhteydessä)
  { category: 'OLAPLEX (väri- tai permanenttikäsittelyn yhteydessä)', category_order: 6, name: 'Lyhyet', price: 25, sort_order: 1 },
  { category: 'OLAPLEX (väri- tai permanenttikäsittelyn yhteydessä)', category_order: 6, name: 'Puolipitkät', price: 30, sort_order: 2 },
  { category: 'OLAPLEX (väri- tai permanenttikäsittelyn yhteydessä)', category_order: 6, name: 'Pitkät', price: 35, sort_order: 3 },
  // OLAPLEX (leikkauksen yhteydessä)
  { category: 'OLAPLEX (leikkauksen yhteydessä)', category_order: 7, name: 'Lyhyet', price: 32, sort_order: 1 },
  { category: 'OLAPLEX (leikkauksen yhteydessä)', category_order: 7, name: 'Puolipitkät', price: 39, sort_order: 2 },
  { category: 'OLAPLEX (leikkauksen yhteydessä)', category_order: 7, name: 'Pitkät', price: 49, sort_order: 3 },
  // OLAPLEX-hoito + föönaus
  { category: 'OLAPLEX-hoito + föönaus', category_order: 8, name: 'Lyhyet', price: 69, sort_order: 1 },
  { category: 'OLAPLEX-hoito + föönaus', category_order: 8, name: 'Puolipitkät', price: 79, sort_order: 2 },
  { category: 'OLAPLEX-hoito + föönaus', category_order: 8, name: 'Pitkät', price: 89, sort_order: 3 },
];

/** Flat list of service names for the booking <select>, grouped by category. */
export function serviceOptionsFrom(prices: PriceRow[]): { category: string; name: string }[] {
  return [...prices]
    .sort((a, b) => a.category_order - b.category_order || a.sort_order - b.sort_order)
    .map((p) => ({ category: p.category, name: `${p.category} — ${p.name}` }));
}
