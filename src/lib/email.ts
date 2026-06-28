/**
 * Transactional email via Resend. All copy is in Finnish.
 *
 * Three flows:
 *   1. notifyOwnerNewRequest   — new request → owner inbox (+ link to /admin)
 *   2. emailCustomerConfirmed  — owner confirms → customer confirmation
 *   3. emailCustomerDeclined   — owner declines → polite "please call" note
 *
 * Degrades gracefully: if RESEND_API_KEY is missing, emails are logged to the
 * server console instead of sent, so local dev works without a Resend account.
 */
import { Resend } from 'resend';
import { DEFAULT_CONTENT } from './defaults';

const API_KEY = import.meta.env.RESEND_API_KEY;
const FROM = import.meta.env.RESEND_FROM || 'Salon Janika <onboarding@resend.dev>';
const OWNER_EMAIL = import.meta.env.OWNER_EMAIL || '';
const SITE_URL = import.meta.env.SITE_URL || 'http://localhost:4321';

const resend = API_KEY ? new Resend(API_KEY) : null;

export interface BookingEmailData {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email: string | null;
  service: string;
  preferred_date: string | null;
  preferred_time: string | null;
  message: string | null;
  admin_note?: string | null;
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function fmtDate(d: string | null): string {
  if (!d) return 'Ei toivetta';
  const [y, m, day] = d.split('-');
  if (!y || !m || !day) return d;
  return `${day}.${m}.${y}`;
}

/** Branded HTML shell — warm neutrals, serif headings, gold rule. */
function shell(title: string, bodyHtml: string): string {
  return `<!doctype html><html lang="fi"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title></head>
<body style="margin:0;padding:0;background:#f5f0e8;font-family:Georgia,'Times New Roman',serif;color:#1c1a17;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f0e8;padding:32px 0;">
    <tr><td align="center">
      <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fcfaf6;border:1px solid #e6ddcf;">
        <tr><td style="padding:40px 44px 16px;text-align:center;">
          <div style="font-family:Arial,sans-serif;font-size:11px;letter-spacing:4px;text-transform:uppercase;color:#a99a86;">Parturi-Kampaamo</div>
          <div style="font-size:34px;color:#b8995e;font-style:italic;margin-top:6px;">Salon Janika</div>
        </td></tr>
        <tr><td style="padding:0 44px;"><div style="height:1px;background:#e0d6c6;"></div></td></tr>
        <tr><td style="padding:28px 44px 40px;font-size:16px;line-height:1.65;color:#3a3631;">
          ${bodyHtml}
        </td></tr>
        <tr><td style="padding:20px 44px 36px;border-top:1px solid #efe7d8;font-family:Arial,sans-serif;font-size:12px;line-height:1.7;color:#a99a86;text-align:center;">
          Salon Janika · ${esc(DEFAULT_CONTENT.address_street)}, ${esc(DEFAULT_CONTENT.address_postal)}<br>
          ${esc(DEFAULT_CONTENT.footer_hours)} · ${esc(DEFAULT_CONTENT.phone_display)}
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function detailRows(b: BookingEmailData): string {
  const row = (k: string, v: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#a99a86;font-family:Arial,sans-serif;font-size:13px;white-space:nowrap;vertical-align:top;">${esc(k)}</td><td style="padding:6px 0;color:#1c1a17;font-size:15px;">${esc(v)}</td></tr>`;
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;margin:8px 0 4px;">
    ${row('Nimi', b.customer_name)}
    ${row('Puhelin', b.customer_phone)}
    ${b.customer_email ? row('Sähköposti', b.customer_email) : ''}
    ${row('Palvelu', b.service)}
    ${row('Toivottu päivä', fmtDate(b.preferred_date))}
    ${b.preferred_time ? row('Toivottu aika', b.preferred_time) : ''}
    ${b.message ? row('Viesti', b.message) : ''}
  </table>`;
}

async function send(to: string, subject: string, html: string): Promise<boolean> {
  if (!resend) {
    console.info(`[email:dev] (Resend not configured) → ${to} — ${subject}`);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: FROM, to, subject, html });
    if (error) {
      console.error('[email] Resend error:', error);
      return false;
    }
    return true;
  } catch (e) {
    console.error('[email] send failed:', e);
    return false;
  }
}

/** 1. New request → owner. */
export async function notifyOwnerNewRequest(b: BookingEmailData): Promise<boolean> {
  if (!OWNER_EMAIL) {
    console.info('[email:dev] OWNER_EMAIL not set — skipping owner notification.');
    return false;
  }
  const html = shell(
    'Uusi varauspyyntö',
    `<h1 style="font-size:24px;font-weight:normal;margin:0 0 6px;">Uusi varauspyyntö</h1>
     <p style="margin:0 0 18px;color:#6b6358;font-family:Arial,sans-serif;font-size:14px;">Asiakas on jättänyt uuden varauspyynnön.</p>
     ${detailRows(b)}
     <div style="margin-top:28px;">
       <a href="${SITE_URL}/admin" style="display:inline-block;background:#1c1a17;color:#fcfaf6;text-decoration:none;font-family:Arial,sans-serif;font-size:13px;letter-spacing:2px;text-transform:uppercase;padding:14px 28px;border-radius:999px;">Avaa hallintapaneeli</a>
     </div>`,
  );
  return send(OWNER_EMAIL, 'Uusi varauspyyntö — Salon Janika', html);
}

/** 2. Confirmed → customer. */
export async function emailCustomerConfirmed(b: BookingEmailData): Promise<boolean> {
  if (!b.customer_email) return false;
  const html = shell(
    'Varauksesi on vahvistettu',
    `<h1 style="font-size:24px;font-weight:normal;margin:0 0 6px;">Varauksesi on vahvistettu</h1>
     <p style="margin:0 0 18px;color:#3a3631;">Hei ${esc(b.customer_name)},<br>kiitos varauksestasi. Olen vahvistanut seuraavan ajan:</p>
     ${detailRows(b)}
     ${b.admin_note ? `<p style="margin:18px 0 0;color:#3a3631;"><strong>Terveiseni:</strong> ${esc(b.admin_note)}</p>` : ''}
     <p style="margin:22px 0 0;color:#3a3631;">Osoite: ${esc(DEFAULT_CONTENT.address_street)}, ${esc(DEFAULT_CONTENT.address_postal)}.<br>
     Jos sinulle tulee este, ota yhteyttä: ${esc(DEFAULT_CONTENT.phone_display)}.</p>
     <p style="margin:18px 0 0;color:#b8995e;font-style:italic;font-size:20px;">Tervetuloa!</p>`,
  );
  return send(b.customer_email, 'Varauksesi on vahvistettu — Salon Janika', html);
}

/** 3. Declined → customer (polite, suggest calling). */
export async function emailCustomerDeclined(b: BookingEmailData): Promise<boolean> {
  if (!b.customer_email) return false;
  const html = shell(
    'Tietoa varauspyynnöstäsi',
    `<h1 style="font-size:24px;font-weight:normal;margin:0 0 6px;">Tietoa varauspyynnöstäsi</h1>
     <p style="margin:0 0 16px;color:#3a3631;">Hei ${esc(b.customer_name)},<br>
     kiitos varauspyynnöstäsi. Valitettavasti toivomasi aika ei tällä kertaa sovi.</p>
     ${b.admin_note ? `<p style="margin:0 0 16px;color:#3a3631;">${esc(b.admin_note)}</p>` : ''}
     <p style="margin:0 0 16px;color:#3a3631;">Etsitään yhdessä sinulle sopiva aika — soita minulle:</p>
     <p style="margin:0;font-size:20px;color:#1c1a17;">${esc(DEFAULT_CONTENT.phone_display)}</p>
     <p style="margin:18px 0 0;color:#b8995e;font-style:italic;font-size:20px;">Tervetuloa!</p>`,
  );
  return send(b.customer_email, 'Varauspyyntösi — Salon Janika', html);
}
