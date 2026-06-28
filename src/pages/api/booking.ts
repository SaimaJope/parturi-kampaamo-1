/**
 * Public booking endpoint. POST only.
 *
 * Pipeline: honeypot → rate limit → validate → insert 'pending' → notify owner.
 * Uses the service-role client server-side; never trusts the client.
 *
 * Responds with JSON when the client asks for it (fetch sends
 * `Accept: application/json`), otherwise redirects (no-JS fallback).
 */
import type { APIRoute } from 'astro';
import { validateBooking } from '../../lib/validation';
import { rateLimit, clientIp } from '../../lib/ratelimit';
import { getServiceClient, hasServiceRole } from '../../lib/supabase';
import { notifyOwnerNewRequest } from '../../lib/email';

export const prerender = false;

function wantsJson(request: Request): boolean {
  return (request.headers.get('accept') || '').includes('application/json');
}

export const POST: APIRoute = async ({ request, redirect }) => {
  const json = wantsJson(request);

  const fail = (status: number, body: Record<string, unknown>) =>
    json
      ? new Response(JSON.stringify(body), {
          status,
          headers: { 'content-type': 'application/json' },
        })
      : redirect('/ajanvaraus?error=1', 303);

  // Parse form data
  let form: Record<string, unknown>;
  try {
    const fd = await request.formData();
    form = Object.fromEntries(fd.entries());
  } catch {
    return fail(400, { ok: false, error: 'invalid_request' });
  }

  // 1) Honeypot — bots fill the hidden "website" field. Pretend success.
  if (typeof form.website === 'string' && form.website.trim() !== '') {
    return json
      ? new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        })
      : redirect('/ajanvaraus?ok=1', 303);
  }

  // 2) Rate limit: 5 requests / hour / IP
  const rl = rateLimit(`booking:${clientIp(request)}`, 5, 60 * 60 * 1000);
  if (!rl.allowed) {
    return json
      ? new Response(JSON.stringify({ ok: false, error: 'rate_limited' }), {
          status: 429,
          headers: { 'content-type': 'application/json', 'retry-after': String(rl.retryAfterSec) },
        })
      : redirect('/ajanvaraus?error=rate', 303);
  }

  // 3) Validate
  const result = validateBooking(form);
  if (!result.ok) {
    return json
      ? new Response(JSON.stringify({ ok: false, errors: result.errors }), {
          status: 422,
          headers: { 'content-type': 'application/json' },
        })
      : redirect('/ajanvaraus?error=validation', 303);
  }
  const input = result.value;

  // 4) Persist. If Supabase isn't configured (e.g. local preview), log + succeed
  //    so the form is testable without a backend.
  let bookingId = 'dev-' + Math.round(performance.now());
  if (hasServiceRole()) {
    try {
      const { data, error } = await getServiceClient()
        .from('bookings')
        .insert({
          status: 'pending',
          customer_name: input.customer_name,
          customer_phone: input.customer_phone,
          customer_email: input.customer_email,
          service: input.service,
          preferred_date: input.preferred_date,
          preferred_time: input.preferred_time,
          message: input.message,
          consent_given: input.consent_given,
        })
        .select('id')
        .single();
      if (error || !data) {
        console.error('[booking] insert failed:', error);
        return fail(500, { ok: false, error: 'storage_error' });
      }
      bookingId = data.id;
    } catch (e) {
      console.error('[booking] insert exception:', e);
      return fail(500, { ok: false, error: 'storage_error' });
    }
  } else {
    console.info('[booking:dev] Supabase not configured — request not persisted:', input);
  }

  // 5) Notify owner (best-effort; failure does not block the customer)
  try {
    await notifyOwnerNewRequest({ id: bookingId, ...input });
  } catch (e) {
    console.error('[booking] owner notification failed:', e);
  }

  return json
    ? new Response(JSON.stringify({ ok: true, id: bookingId }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      })
    : redirect('/ajanvaraus?ok=1', 303);
};

// Anything other than POST is not allowed.
export const GET: APIRoute = () =>
  new Response('Method Not Allowed', { status: 405, headers: { allow: 'POST' } });
