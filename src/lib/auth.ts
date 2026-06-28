/**
 * Admin authentication via Supabase Auth (single admin account).
 *
 * Flow:
 *  - /api/auth/login signs in with email+password, stores the access &
 *    refresh tokens in httpOnly, Secure, SameSite=Lax cookies.
 *  - requireAdmin() validates the access token (refreshing if needed) on every
 *    protected route and returns the user, or null.
 *
 * Tokens never reach client JS (httpOnly), and all privileged DB work is done
 * with the service-role client after this check passes.
 */
import type { AstroCookies } from 'astro';
import { getAnonClient, isSupabaseConfigured } from './supabase';

const ACCESS_COOKIE = 'sj_at';
const REFRESH_COOKIE = 'sj_rt';

const COOKIE_OPTS = {
  httpOnly: true,
  secure: import.meta.env.PROD,
  sameSite: 'lax' as const,
  path: '/',
};

export interface AdminUser {
  id: string;
  email: string | undefined;
}

export function setAuthCookies(
  cookies: AstroCookies,
  accessToken: string,
  refreshToken: string,
  expiresIn: number,
): void {
  cookies.set(ACCESS_COOKIE, accessToken, { ...COOKIE_OPTS, maxAge: expiresIn });
  // Refresh token lives longer so sessions survive access-token expiry.
  cookies.set(REFRESH_COOKIE, refreshToken, { ...COOKIE_OPTS, maxAge: 60 * 60 * 24 * 30 });
}

export function clearAuthCookies(cookies: AstroCookies): void {
  cookies.delete(ACCESS_COOKIE, { path: '/' });
  cookies.delete(REFRESH_COOKIE, { path: '/' });
}

/**
 * Returns the authenticated admin, or null. Transparently refreshes the
 * session using the refresh token and rewrites cookies when needed.
 */
export async function requireAdmin(cookies: AstroCookies): Promise<AdminUser | null> {
  if (!isSupabaseConfigured()) return null;

  const accessToken = cookies.get(ACCESS_COOKIE)?.value;
  const refreshToken = cookies.get(REFRESH_COOKIE)?.value;
  if (!accessToken && !refreshToken) return null;

  const client = getAnonClient();

  // 1) Try the current access token.
  if (accessToken) {
    const { data, error } = await client.auth.getUser(accessToken);
    if (!error && data.user) {
      return { id: data.user.id, email: data.user.email };
    }
  }

  // 2) Fall back to refreshing the session.
  if (refreshToken) {
    const { data, error } = await client.auth.refreshSession({ refresh_token: refreshToken });
    if (!error && data.session && data.user) {
      setAuthCookies(
        cookies,
        data.session.access_token,
        data.session.refresh_token,
        data.session.expires_in ?? 3600,
      );
      return { id: data.user.id, email: data.user.email };
    }
  }

  return null;
}

/** Sign in; returns the session on success or an error message (Finnish). */
export async function signInAdmin(
  email: string,
  password: string,
): Promise<
  | { ok: true; access_token: string; refresh_token: string; expires_in: number }
  | { ok: false; error: string }
> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: 'Kirjautuminen ei ole käytettävissä (Supabasea ei ole määritetty).' };
  }
  const client = getAnonClient();
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) {
    return { ok: false, error: 'Virheellinen sähköposti tai salasana.' };
  }
  return {
    ok: true,
    access_token: data.session.access_token,
    refresh_token: data.session.refresh_token,
    expires_in: data.session.expires_in ?? 3600,
  };
}
