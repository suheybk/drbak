import cloudflare from '@astrojs/cloudflare';
import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

import { DEFAULT_LOCALE, LOCALES } from './src/lib/locales.mjs';

/**
 * Astro config — SSR on Cloudflare Workers via the Pages adapter.
 *
 * - i18n: 5 locales, default `tr`, prefix on non-default. AR is RTL — the layout
 *   reads `Astro.currentLocale` and renders `dir="rtl"` accordingly.
 * - Hybrid output: most pages SSR (so they can localise + read auth cookies),
 *   marketing/static pages use `prerender = true` per route.
 * - React islands hydrate only the booking flow + portal interactivity.
 */
export default defineConfig({
  site: 'https://uzmdroguzbak.com',
  output: 'server',
  adapter: cloudflare({
    platformProxy: { enabled: true },
    imageService: 'compile',
  }),
  integrations: [react()],
  vite: {
    plugins: [tailwindcss()],
    resolve: {
      alias: {
        '~': new URL('./src', import.meta.url).pathname,
      },
    },
    ssr: {
      // The api package is a workspace dep but only used for types
      noExternal: ['@dr-bak/ui', '@dr-bak/i18n-keys', '@dr-bak/contracts'],
    },
  },
  i18n: {
    defaultLocale: DEFAULT_LOCALE,
    locales: [...LOCALES],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
    fallback: {
      ar: 'tr',
      en: 'tr',
      fr: 'tr',
      es: 'tr',
    },
  },
  experimental: {
    clientPrerender: true,
  },
});
