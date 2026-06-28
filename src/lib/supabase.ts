/**
 * Supabase client factories.
 *
 * - `getServiceClient()` uses the SERVICE_ROLE key and bypasses RLS. It is
 *   SERVER ONLY and must never be imported into client-side code.
 * - `getAnonClient(token?)` uses the anon key; pass an access token to act as
 *   an authenticated admin (used for auth verification).
 *
 * `isSupabaseConfigured()` lets pages degrade gracefully to seeded defaults
 * when env vars are absent (e.g. first local run before setup).
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = import.meta.env.PUBLIC_SUPABASE_URL;
const ANON = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

export function hasServiceRole(): boolean {
  return Boolean(URL && SERVICE);
}

let serviceClient: SupabaseClient | null = null;

/** Privileged, RLS-bypassing client. SERVER ONLY. */
export function getServiceClient(): SupabaseClient {
  if (!URL || !SERVICE) {
    throw new Error(
      'Supabase service role not configured (PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).',
    );
  }
  if (!serviceClient) {
    serviceClient = createClient(URL, SERVICE, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return serviceClient;
}

/** Anon client, optionally authenticated with a user access token. */
export function getAnonClient(accessToken?: string): SupabaseClient {
  if (!URL || !ANON) {
    throw new Error('Supabase not configured (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY).');
  }
  return createClient(URL, ANON, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: accessToken
      ? { headers: { Authorization: `Bearer ${accessToken}` } }
      : undefined,
  });
}
