/**
 * Base-aware URL helpers.
 *
 * On Vercel / local dev the site is served at "/", so BASE_URL is "/".
 * On GitHub Pages (project site) it is served at "/parturi-kampaamo-1/",
 * so every internal link and asset path must be prefixed with the base.
 * Using these helpers keeps the same source working in both targets.
 */
const RAW_BASE = import.meta.env.BASE_URL; // "/" or "/parturi-kampaamo-1/"
const BASE = RAW_BASE.replace(/\/$/, ''); // "" or "/parturi-kampaamo-1"

/** Prefix an absolute site path (e.g. "/hinnasto", "/images/x.jpg") with the base. */
export function withBase(path: string): string {
  if (!path.startsWith('/')) return path; // external / mailto / tel / #
  return BASE + path;
}

/** Strip the base prefix from a pathname and normalise trailing slash. */
export function stripBase(pathname: string): string {
  let p = pathname;
  if (BASE && p.startsWith(BASE)) p = p.slice(BASE.length);
  if (p.length > 1) p = p.replace(/\/$/, '');
  return p || '/';
}

/** Active-nav test that works regardless of base prefix / trailing slash. */
export function isActive(currentPathname: string, href: string): boolean {
  const cur = stripBase(currentPathname);
  if (href === '/') return cur === '/';
  return cur === href || cur.startsWith(href + '/');
}
