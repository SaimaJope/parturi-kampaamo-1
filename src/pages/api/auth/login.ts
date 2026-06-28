/**
 * Admin login. POST { email, password } → sets httpOnly session cookies and
 * redirects to /admin. On failure, redirects back to /admin/login?error=1.
 */
import type { APIRoute } from 'astro';
import { signInAdmin, setAuthCookies } from '../../../lib/auth';
import { rateLimit, clientIp } from '../../../lib/ratelimit';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  // Throttle brute-force attempts: 10 / 15 min / IP.
  const rl = rateLimit(`login:${clientIp(request)}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) return redirect('/admin/login?error=rate', 303);

  let email = '';
  let password = '';
  try {
    const fd = await request.formData();
    email = String(fd.get('email') || '').trim().toLowerCase();
    password = String(fd.get('password') || '');
  } catch {
    return redirect('/admin/login?error=1', 303);
  }

  if (!email || !password) return redirect('/admin/login?error=1', 303);

  const result = await signInAdmin(email, password);
  if (!result.ok) return redirect('/admin/login?error=1', 303);

  setAuthCookies(cookies, result.access_token, result.refresh_token, result.expires_in);
  return redirect('/admin', 303);
};
