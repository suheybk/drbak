/**
 * URL helpers — locale-prefixed routing.
 *
 * Default locale (TR) is unprefixed. All other locales use `/<locale>/...`.
 * Slugs are the same across locales for now (e.g. `services/tms`); the
 * localised URL slugs (e.g. `hizmetler/tms`, `الخدمات/tms`) are a Phase 2
 * marketing/SEO concern — see memory/dr-bak-resume-here.md.
 *
 * The `localeHrefsFor` helper builds the hreflang map for the locale switcher.
 */
import type { Locale } from '@dr-bak/i18n-keys';

const PREFIX = (locale: Locale): string => (locale === 'tr' ? '' : `/${locale}`);

export const routes = {
  home: (l: Locale) => `${PREFIX(l)}/` || '/',
  services: (l: Locale) => `${PREFIX(l)}/services`,
  serviceDetail: (l: Locale, slug: string) => `${PREFIX(l)}/services/${slug}`,
  conditions: (l: Locale) => `${PREFIX(l)}/conditions`,
  conditionDetail: (l: Locale, slug: string) => `${PREFIX(l)}/conditions/${slug}`,
  about: (l: Locale) => `${PREFIX(l)}/about`,
  blog: (l: Locale) => `${PREFIX(l)}/blog`,
  blogPost: (l: Locale, slug: string) => `${PREFIX(l)}/blog/${slug}`,
  faq: (l: Locale) => `${PREFIX(l)}/faq`,
  contact: (l: Locale) => `${PREFIX(l)}/contact`,
  kvkk: (l: Locale) => `${PREFIX(l)}/kvkk`,
  accessibility: (l: Locale) => `${PREFIX(l)}/accessibility`,
  book: (l: Locale) => `${PREFIX(l)}/book`,
  portal: (l: Locale) => `${PREFIX(l)}/account`,
  login: (l: Locale) => `${PREFIX(l)}/login`,
  register: (l: Locale) => `${PREFIX(l)}/register`,
  resetPassword: (l: Locale) => `${PREFIX(l)}/reset-password`,
  verifyEmail: (l: Locale) => `${PREFIX(l)}/verify-email`,
} as const;

/** Build the locale-switcher hrefs for the current page. */
export const localeHrefsFor = (builder: (l: Locale) => string): Record<Locale, string> => ({
  tr: builder('tr'),
  ar: builder('ar'),
  en: builder('en'),
  fr: builder('fr'),
  es: builder('es'),
});
