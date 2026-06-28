/**
 * Price list editing. Three actions:
 *   - save:   bulk-update existing rows from rows[<id>][field] fields
 *   - add:    insert a new price row
 *   - delete: remove a row by id
 * Requires admin auth.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { getServiceClient } from '../../../lib/supabase';

export const prerender = false;

function num(v: FormDataEntryValue | null, fallback = 0): number {
  const n = parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : fallback;
}

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return redirect('/admin/login', 303);

  const fd = await request.formData();
  const action = String(fd.get('action') || 'save');
  const db = getServiceClient();
  const now = new Date().toISOString();

  try {
    if (action === 'delete') {
      const id = String(fd.get('id') || '');
      if (id) await db.from('prices').delete().eq('id', id);
      return redirect('/admin/sisalto?done=prices#hinnasto', 303);
    }

    if (action === 'add') {
      const category = String(fd.get('category') || '').trim();
      const name = String(fd.get('name') || '').trim();
      if (!category || !name) return redirect('/admin/sisalto?error=1#hinnasto', 303);
      await db.from('prices').insert({
        category,
        category_order: Math.round(num(fd.get('category_order'), 99)),
        name,
        price: fd.get('price') ? num(fd.get('price')) : null,
        sort_order: Math.round(num(fd.get('sort_order'), 99)),
        updated_at: now,
      });
      return redirect('/admin/sisalto?done=prices#hinnasto', 303);
    }

    // action === 'save' — bulk update
    // Collect rows[<id>][field] into a map.
    const rows = new Map<string, Record<string, string>>();
    for (const [key, value] of fd.entries()) {
      const m = key.match(/^rows\[([^\]]+)\]\[([^\]]+)\]$/);
      if (m) {
        const [, id, field] = m;
        if (!rows.has(id)) rows.set(id, {});
        rows.get(id)![field] = String(value);
      }
    }
    for (const [id, r] of rows) {
      await db
        .from('prices')
        .update({
          category: (r.category ?? '').trim(),
          category_order: Math.round(num(r.category_order, 0)),
          name: (r.name ?? '').trim(),
          price: r.price !== undefined && r.price !== '' ? num(r.price) : null,
          sort_order: Math.round(num(r.sort_order, 0)),
          updated_at: now,
        })
        .eq('id', id);
    }
    return redirect('/admin/sisalto?done=prices#hinnasto', 303);
  } catch (e) {
    console.error('[admin] price update failed:', e);
    return redirect('/admin/sisalto?error=1#hinnasto', 303);
  }
};
