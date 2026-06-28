// @ts-check
import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

// The public-facing site URL. Override in production via SITE_URL env var.
const SITE_URL = process.env.SITE_URL || 'https://salonjanika.fi';

// https://astro.build/config
export default defineConfig({
  site: SITE_URL,
  output: 'server',
  adapter: vercel({
    webAnalytics: { enabled: false },
  }),
  integrations: [
    sitemap({
      // The admin and API routes must never appear in the public sitemap.
      filter: (page) => !page.includes('/admin') && !page.includes('/api'),
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
  },
});
