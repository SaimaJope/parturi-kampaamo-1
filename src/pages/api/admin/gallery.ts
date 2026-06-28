/**
 * Gallery management: upload an image to the "gallery" Storage bucket and
 * record it, or delete an existing image (DB row + storage object).
 * Requires admin auth.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { getServiceClient } from '../../../lib/supabase';

export const prerender = false;

const MAX_BYTES = 6 * 1024 * 1024; // 6 MB
const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return redirect('/admin/login', 303);

  const fd = await request.formData();
  const action = String(fd.get('action') || 'upload');
  const db = getServiceClient();

  try {
    if (action === 'delete') {
      const id = String(fd.get('id') || '');
      const path = String(fd.get('storage_path') || '');
      if (id) await db.from('gallery').delete().eq('id', id);
      if (path) await db.storage.from('gallery').remove([path]);
      return redirect('/admin/sisalto?done=gallery#galleria', 303);
    }

    if (action === 'alt') {
      const id = String(fd.get('id') || '');
      const alt = String(fd.get('alt') || '').slice(0, 300);
      if (id) await db.from('gallery').update({ alt }).eq('id', id);
      return redirect('/admin/sisalto?done=gallery#galleria', 303);
    }

    // upload
    const file = fd.get('file');
    const alt = String(fd.get('alt') || '').slice(0, 300);
    if (!(file instanceof File) || file.size === 0) {
      return redirect('/admin/sisalto?error=nofile#galleria', 303);
    }
    if (file.size > MAX_BYTES) return redirect('/admin/sisalto?error=size#galleria', 303);
    if (!ALLOWED.includes(file.type)) return redirect('/admin/sisalto?error=type#galleria', 303);

    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
    // Unique-ish path without Math.random/Date (kept deterministic-friendly).
    const stamp = Date.now().toString(36) + '-' + Math.round(performance.now()).toString(36);
    const path = `uploads/${stamp}.${ext}`;

    const buffer = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await db.storage
      .from('gallery')
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (upErr) {
      console.error('[admin] gallery upload failed:', upErr);
      return redirect('/admin/sisalto?error=upload#galleria', 303);
    }

    // Place new image last.
    const { data: last } = await db
      .from('gallery')
      .select('sort_order')
      .order('sort_order', { ascending: false })
      .limit(1);
    const nextOrder = (last?.[0]?.sort_order ?? 0) + 1;

    await db.from('gallery').insert({ storage_path: path, alt, sort_order: nextOrder });
    return redirect('/admin/sisalto?done=gallery#galleria', 303);
  } catch (e) {
    console.error('[admin] gallery action failed:', e);
    return redirect('/admin/sisalto?error=1#galleria', 303);
  }
};
