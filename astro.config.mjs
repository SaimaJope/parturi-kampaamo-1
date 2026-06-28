// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// The public-facing site URL. Override in production via SITE_URL env var.
const SITE_URL = process.env.SITE_URL || 'https://salonjanika.fi';

// GitHub Pages (static) build: set GITHUB_PAGES=true in CI. Serves the site
// as a static preview at https://<user>.github.io/<repo>/. Booking + admin
// (server routes) are excluded from this build — they need Vercel/Netlify.
const PAGES = process.env.GITHUB_PAGES === 'true';
const REPO = 'parturi-kampaamo-1';

// https://astro.build/config
export default defineConfig({
  site: PAGES ? 'https://saimajope.github.io' : SITE_URL,
  base: PAGES ? `/${REPO}` : undefined,
  output: PAGES ? 'static' : 'server',
  adapter: PAGES ? undefined : vercel({ webAnalytics: { enabled: false } }),
  integrations: [
    sitemap({
      filter: (page) => !page.includes('/admin') && !page.includes('/api'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
