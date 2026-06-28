/**
 * Content access layer for public pages.
 *
 * Reads live content/prices/gallery from Supabase. If Supabase is not
 * configured, or a query fails, it falls back to the seeded defaults so the
 * site always renders. All reads happen server-side.
 */
import {
  DEFAULT_CONTENT,
  DEFAULT_PRICES,
  type ContentKey,
  type PriceRow,
} from './defaults';
import { getServiceClient, getAnonClient, isSupabaseConfigured, hasServiceRole } from './supabase';

export type ContentMap = Record<string, string>;

/** Pick the best available read client (service role preferred, else anon). */
function readClient() {
  if (hasServiceRole()) return getServiceClient();
  return getAnonClient();
}

/** Returns the full content map, merging DB values over the defaults. */
export async function getContent(): Promise<ContentMap> {
  const base: ContentMap = { ...DEFAULT_CONTENT };
  if (!isSupabaseConfigured()) return base;
  try {
    const { data, error } = await readClient()
      .from('site_content')
      .select('key, value');
    if (error || !data) return base;
    for (const row of data) {
      if (row.value != null && row.value !== '') base[row.key] = row.value;
    }
    return base;
  } catch {
    return base;
  }
}

/** Convenience: typed getter with default fallback. */
export function c(content: ContentMap, key: ContentKey): string {
  return content[key] ?? DEFAULT_CONTENT[key] ?? '';
}

/** Returns price rows sorted by category + sort order. */
export async function getPrices(): Promise<PriceRow[]> {
  if (!isSupabaseConfigured()) return sortPrices(DEFAULT_PRICES);
  try {
    const { data, error } = await readClient()
      .from('prices')
      .select('category, category_order, name, price, price_suffix, sort_order');
    if (error || !data || data.length === 0) return sortPrices(DEFAULT_PRICES);
    return sortPrices(
      data.map((r) => ({
        category: r.category,
        category_order: r.category_order ?? 0,
        name: r.name,
        price: r.price === null ? null : Number(r.price),
        price_suffix: r.price_suffix ?? '€',
        sort_order: r.sort_order ?? 0,
      })),
    );
  } catch {
    return sortPrices(DEFAULT_PRICES);
  }
}

function sortPrices(rows: PriceRow[]): PriceRow[] {
  return [...rows].sort(
    (a, b) => a.category_order - b.category_order || a.sort_order - b.sort_order,
  );
}

/** Group prices into ordered categories for rendering. */
export function groupPrices(rows: PriceRow[]): { category: string; items: PriceRow[] }[] {
  const groups: { category: string; items: PriceRow[] }[] = [];
  for (const row of rows) {
    let g = groups.find((x) => x.category === row.category);
    if (!g) {
      g = { category: row.category, items: [] };
      groups.push(g);
    }
    g.items.push(row);
  }
  return groups;
}

export interface GalleryImage {
  url: string;
  alt: string;
}

/** Returns gallery images (public Storage URLs), or [] if none/unconfigured. */
export async function getGallery(): Promise<GalleryImage[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const client = readClient();
    const { data, error } = await client
      .from('gallery')
      .select('storage_path, alt, sort_order')
      .order('sort_order', { ascending: true });
    if (error || !data) return [];
    return data.map((row) => ({
      url: client.storage.from('gallery').getPublicUrl(row.storage_path).data.publicUrl,
      alt: row.alt ?? '',
    }));
  } catch {
    return [];
  }
}
