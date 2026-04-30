/**
 * Astro can't import `.ts` from astro.config without a build step, so we
 * mirror locale constants here as `.mjs`. Keep these in sync with
 * `@dr-bak/i18n-keys` — there's a typecheck cross-check in `lib/locales.ts`.
 */
export const LOCALES = ['tr', 'ar', 'en', 'fr', 'es'];
export const DEFAULT_LOCALE = 'tr';
export const RTL_LOCALES = new Set(['ar']);
