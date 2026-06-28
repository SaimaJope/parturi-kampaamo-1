/**
 * Update structured site content. Receives any number of `content[<key>]`
 * fields and upserts them into site_content. Requires admin auth.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { getServiceClient } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return redirect('/admin/login', 303);

  const fd = await request.formData();
  const updates: { key: string; value: string }[] = [];
  for (const [name, value] of fd.entries()) {
    const m = name.match(/^content\[(.+)\]$/);
    if (m) updates.push({ key: m[1], value: String(value).slice(0, 5000) });
  }
  if (updates.length === 0) return redirect('/admin/sisalto?error=1', 303);

  const db = getServiceClient();
  const now = new Date().toISOString();
  const { error } = await db
    .from('site_content')
    .upsert(
      updates.map((u) => ({ key: u.key, value: u.value, updated_at: now })),
      { onConflict: 'key' },
    );
  if (error) {
    console.error('[admin] content update failed:', error);
    return redirect('/admin/sisalto?error=1', 303);
  }
  return redirect('/admin/sisalto?done=content#tekstit', 303);
};
