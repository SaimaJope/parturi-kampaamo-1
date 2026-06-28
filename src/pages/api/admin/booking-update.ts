/**
 * Admin booking actions: confirm / decline / delete.
 * Requires an authenticated admin. Fires the matching customer email on
 * confirm/decline. Uses the service-role client.
 */
import type { APIRoute } from 'astro';
import { requireAdmin } from '../../../lib/auth';
import { getServiceClient } from '../../../lib/supabase';
import { emailCustomerConfirmed, emailCustomerDeclined, type BookingEmailData } from '../../../lib/email';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  const admin = await requireAdmin(cookies);
  if (!admin) return redirect('/admin/login', 303);

  const fd = await request.formData();
  const id = String(fd.get('id') || '');
  const action = String(fd.get('action') || '');
  const adminNote = String(fd.get('admin_note') || '').trim().slice(0, 1000) || null;
  if (!id) return redirect('/admin?error=1', 303);

  const db = getServiceClient();

  if (action === 'delete') {
    await db.from('bookings').delete().eq('id', id);
    return redirect('/admin?done=deleted', 303);
  }

  const status =
    action === 'confirm' ? 'confirmed' : action === 'decline' ? 'declined' : null;
  if (!status) return redirect('/admin?error=1', 303);

  const { data, error } = await db
    .from('bookings')
    .update({ status, admin_note: adminNote })
    .eq('id', id)
    .select('*')
    .single();

  if (error || !data) {
    console.error('[admin] booking update failed:', error);
    return redirect('/admin?error=1', 303);
  }

  // Fire the matching customer email (best-effort).
  const emailData: BookingEmailData = {
    id: data.id,
    customer_name: data.customer_name,
    customer_phone: data.customer_phone,
    customer_email: data.customer_email,
    service: data.service,
    preferred_date: data.preferred_date,
    preferred_time: data.preferred_time,
    message: data.message,
    admin_note: data.admin_note,
  };
  try {
    if (status === 'confirmed') await emailCustomerConfirmed(emailData);
    else await emailCustomerDeclined(emailData);
  } catch (e) {
    console.error('[admin] customer email failed:', e);
  }

  return redirect(`/admin?done=${status}`, 303);
};
