/**
 * Data-retention action: delete declined/old confirmed bookings older than
 * N days (default 180 / 6 months). Calls the purge_old_bookings() SQL function.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { getServiceClient } from '../../../lib/supabase';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return redirect('/admin/login', 303);

  const fd = await request.formData();
  let days = parseInt(String(fd.get('days') || '180'), 10);
  if (!Number.isFinite(days) || days < 30) days = 180;

  try {
    await getServiceClient().rpc('purge_old_bookings', { retention_days: days });
  } catch (e) {
    console.error('[admin] cleanup failed:', e);
    return redirect('/admin?error=cleanup', 303);
  }
  return redirect('/admin?done=deleted', 303);
};
