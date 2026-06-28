# Salon Janika — website + booking system

A luxury-minimal website for **Salon Janika**, a family parturi-kampaamo (hair
salon) in Matinkylä, Espoo. Four public pages in Finnish, a custom
request-based reservation system, and a single admin panel where the owner
edits all site content **and** accepts/declines booking requests.

Visitor-facing copy is Finnish; code, comments, and this README are English.

- **Framework:** [Astro](https://astro.build) (SSR / `output: 'server'`) + TypeScript
- **Styling:** Tailwind CSS v4 (warm-neutral luxury theme) + Google Fonts
  (Pinyon Script, Cormorant Garamond, Jost)
- **Database / Auth / Storage:** [Supabase](https://supabase.com)
- **Email:** [Resend](https://resend.com)
- **Deploy:** Vercel (adapter included) or Netlify (one-line swap, see below)

> **Runs out of the box.** With no environment variables set, the site renders
> the seeded Finnish defaults and the booking form succeeds (logging instead of
> emailing). This lets you preview the design with just `npm install && npm run
> dev`. Supabase + Resend unlock persistence, email, and the admin panel.

---

## 1. Quick start (local design preview)

```bash
npm install
npm run dev          # http://localhost:4321
```

To enable the database, email, and admin panel, copy the env template and fill
it in (next section):

```bash
cp .env.example .env
```

`npm run build` produces the production bundle; `npm run preview` serves it.

---

## 2. Required environment variables

See `.env.example`. Server-only secrets (`SUPABASE_SERVICE_ROLE_KEY`,
`RESEND_API_KEY`) are **never** shipped to the browser — only `PUBLIC_`-prefixed
vars are exposed client-side.

| Variable | Exposure | Purpose |
|---|---|---|
| `SITE_URL` | build | Canonical URL (sitemap, OG, JSON-LD, email links) |
| `PUBLIC_SUPABASE_URL` | client | Supabase project URL |
| `PUBLIC_SUPABASE_ANON_KEY` | client | Supabase anon key (RLS-protected) |
| `SUPABASE_SERVICE_ROLE_KEY` | **server only** | Privileged DB access (bypasses RLS) |
| `RESEND_API_KEY` | **server only** | Sending transactional email |
| `RESEND_FROM` | server | From address on a verified domain |
| `OWNER_EMAIL` | server | Inbox that receives new booking requests |

---

## 3. Create the Supabase project & run the SQL

1. Create a project at [supabase.com](https://supabase.com).
2. **Project Settings → API**: copy the **Project URL**, the **anon** key, and
   the **service_role** key into `.env`.
3. Open the **SQL Editor**, paste the contents of
   [`supabase/schema.sql`](supabase/schema.sql), and run it. This:
   - creates the `bookings`, `site_content`, `prices`, `gallery` tables,
   - enables **Row Level Security** with the right policies,
   - creates the public `gallery` Storage bucket,
   - seeds the default Finnish content and the **full price list**,
   - adds a `purge_old_bookings()` retention function.

The script is idempotent — safe to re-run.

### Row Level Security summary

- **bookings:** anyone may `INSERT` (only a `pending` row with consent); `SELECT`
  / `UPDATE` / `DELETE` require an authenticated admin.
- **site_content / prices / gallery:** public `SELECT` (it is public info);
  writes require an authenticated admin.
- All privileged server endpoints use the **service-role** key, so the policies
  are defence-in-depth rather than the only line of defence.

---

## 4. Verify a Resend sending domain

1. Create an account at [resend.com](https://resend.com) and add your domain
   (e.g. `salonjanika.fi`).
2. Add the **SPF / DKIM** DNS records Resend shows you and wait for
   verification.
3. Create an **API key** → set `RESEND_API_KEY`.
4. Set `RESEND_FROM` to an address on the verified domain, e.g.
   `Salon Janika <varaukset@salonjanika.fi>`, and `OWNER_EMAIL` to the inbox
   that should receive new requests.

Until a domain is verified you can test with Resend's `onboarding@resend.dev`
sender (limited to your own account email).

All three email flows are in Finnish:
- **New request →** owner notification (with a link to `/admin`),
- **Confirmed →** customer confirmation (service, date/time, address, phone),
- **Declined →** polite note suggesting they call for another time.

---

## 5. Create the admin user (Janika's login)

There is a single admin account, authenticated via Supabase Auth.

1. In Supabase → **Authentication → Users → Add user**.
2. Enter Janika's email + a strong password, and mark the email confirmed
   (Auto-confirm). No public sign-up exists.
3. She logs in at **`/admin`** → redirected to **`/admin/login`**.

> Tip: disable public sign-ups under **Authentication → Providers → Email** so
> only the manually-created admin can exist.

---

## 6. How Janika uses the admin panel

Go to **`/admin`** and log in. Two jobs, one place:

### A — Varauspyynnöt (booking requests)
- Requests are listed newest-first; filter by **Odottaa / Vahvistetut /
  Hylätyt / Kaikki**.
- Expand a request to see full details.
- **Hyväksy** → status `confirmed`, customer gets a confirmation email.
- **Hylkää** → status `declined`, customer gets a polite "please call" email.
- Optional **muistiinpano / viesti asiakkaalle** is included in the email.
- **Poista** removes a request permanently.
- A **data-retention** action deletes declined/old confirmed requests older
  than N days (default 180).

### B — Sisältö (content)
Structured forms (not a freeform page builder):
- **Tekstit:** hero tagline, etusivu body, yhteystiedot text, ajanvaraus intro,
  opening hours, phone, address.
- **Hinnasto:** editable price rows (category, name, price, ordering); add and
  delete rows.
- **Galleria:** upload / delete images (Supabase Storage) with alt text.

Public pages read this content live from the database; the verbatim copy in
`src/lib/defaults.ts` / `supabase/schema.sql` is the seeded default.

---

## 7. Deploy

### Vercel (default — adapter already configured)
1. Push the repo to GitHub and import it in Vercel.
2. Add all env vars (Project → Settings → Environment Variables).
3. Deploy. Astro's Vercel adapter handles SSR automatically.

### Netlify (one-line swap)
1. `npm install @astrojs/netlify` and in `astro.config.mjs` replace:
   ```js
   import vercel from '@astrojs/vercel';
   // → import netlify from '@astrojs/netlify';
   adapter: vercel({ ... })  // → adapter: netlify()
   ```
2. Add the same env vars in Netlify → Site settings → Environment variables.

Set `SITE_URL` to the production domain so canonical URLs, the sitemap, OG tags,
and email links are correct.

---

## 8. Swapping the custom booking for Timma / Vello / Fresha

If the owner later prefers a third-party booking platform:

1. Open `src/pages/ajanvaraus.astro`.
2. Replace the `<BookingForm ... />` block with the provider's embed snippet
   (an `<iframe>` or `<script>` widget from Timma / Vello / Fresha).
3. Optionally delete `src/components/BookingForm.astro`,
   `src/pages/api/booking.ts`, and the booking-related email functions.

The rest of the site (content, admin content editing, design) is unaffected.
You can keep the admin **Sisältö** section even without the custom booking.

---

## 9. Security & GDPR notes

- **Consent** is required on the booking form; submissions without it are
  rejected server-side.
- A **tietosuojaseloste** template lives at `/tietosuoja`
  (`src/pages/tietosuoja.astro`). **Complete the `// TODO` items** — data
  controller's legal name + Y-tunnus, contact email, and the confirmed legal
  basis — before going live.
- **Data Processing Agreements (DPA):** you must accept/execute a DPA with both
  **Supabase** and **Resend** (both offer GDPR DPAs) since they process
  personal data on your behalf.
- **Data retention:** use the admin "Poista vanhat" action, or schedule the SQL
  function (e.g. a Supabase scheduled job / cron):
  ```sql
  select public.purge_old_bookings(180);  -- delete declined/old after 180 days
  ```
- **Rate limiting:** the public booking endpoint is rate-limited per IP
  (5 / hour) with a honeypot field for spam. The limiter is in-memory
  (single-instance). For multi-region serverless at scale, back it with a
  Supabase table or Upstash Redis — see `src/lib/ratelimit.ts`.
- Inputs are validated and sanitised in `src/lib/validation.ts`.

---

## 10. Placeholders / TODO before launch

Temporary **stock photography** ships in `/public/images/*.jpg` (sourced from
[Unsplash](https://unsplash.com), whose licence permits free commercial use with
no attribution required). All photos are rendered **black & white via CSS**
(`.photo` / `.photo-hover` in `global.css`) for a cohesive editorial look —
swap the source files and the treatment carries over automatically.

Replace with the salon's own photography before launch (export AVIF/WebP for
best performance):

- [ ] **Hero photo** → `public/images/hero.jpg` (or swap the `src` in
      `src/pages/index.astro` to a `.avif/.webp`).
- [ ] **About / contact photos** → `public/images/about.jpg`, `contact.jpg`.
- [ ] **Gallery** → upload real images in `/admin` → Sisältö → Galleria
      (the `gallery-*.jpg` defaults show until then).
- [ ] **Social links** → add real profile URLs in `sameAs` (BaseLayout JSON-LD)
      — currently empty placeholders.
- [ ] **Tietosuojaseloste** → fill the `// TODO` legal details.
- [ ] **Map coordinates** → optional exact `geo` lat/lng in BaseLayout JSON-LD.
- [ ] **Logo** → `public/logo.png` is the supplied "Salon Janika" wordmark.

Do **not** invent reviews, awards, or years of experience — none were provided.

---

## 11. Project structure

```
src/
  components/   Header, Footer, SectionTitle, Reveal, PriceList, Gallery, BookingForm
  layouts/      BaseLayout (public), AdminLayout (admin)
  lib/          supabase, content (+ defaults), email (Resend), auth, validation, ratelimit
  pages/
    index · hinnasto · yhteystiedot · ajanvaraus · tietosuoja
    admin/      login · index (bookings) · sisalto (content)
    api/        booking · auth/{login,logout} · admin/{booking-update,content-update,price-update,gallery,cleanup}
public/
  images/       placeholder SVGs · logo.png · favicon.svg · robots.txt
supabase/
  schema.sql    schema + RLS + seed (content & full price list) + retention fn
```

---

## 12. Assumptions made

- **Champagne-gold accent.** The brief specified taupe as the only accent, but
  the supplied logo is gold script. A muted champagne gold (`#b8995e`) is used
  sparingly for accents/script so the site harmonises with the wordmark, while
  everything else stays ink + cream + taupe as specified.
- **Booking is request-based** (not real-time slots): a request is stored as
  `pending` and the owner confirms — matching the brief.
- **Graceful degradation:** the site runs without Supabase/Resend for design
  preview; persistence/email/admin require them.
- Google Maps is embedded via a keyless `output=embed` iframe (no API key
  needed).
