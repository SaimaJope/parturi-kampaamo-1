/// <reference path="../.astro/types.d.ts" />
/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Supabase project URL (safe to expose). */
  readonly PUBLIC_SUPABASE_URL: string;
  /** Supabase anon/public key (safe to expose, RLS-protected). */
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  /** Supabase service-role key — SERVER ONLY, never shipped to the client. */
  readonly SUPABASE_SERVICE_ROLE_KEY: string;
  /** Resend API key — SERVER ONLY. */
  readonly RESEND_API_KEY: string;
  /** From address for transactional email, e.g. "Salon Janika <varaukset@salonjanika.fi>". */
  readonly RESEND_FROM: string;
  /** Where new booking-request notifications are sent (the owner's inbox). */
  readonly OWNER_EMAIL: string;
  /** Canonical site URL, e.g. https://salonjanika.fi */
  readonly SITE_URL: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
