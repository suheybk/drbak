/**
 * Locale helpers + cross-check that the .mjs constants match the typed
 * @dr-bak/i18n-keys constants (TS-only — astro.config.mjs uses the .mjs).
 */
import { LOCALES as KEYS_LOCALES, DEFAULT_LOCALE as KEYS_DEFAULT, type Locale } from '@dr-bak/i18n-keys';
import { LOCALES, DEFAULT_LOCALE } from './locales.mjs';

// Type-level cross-check: if you change one list and forget the other, this fails to compile.
type _Check =
  (typeof LOCALES)[number] extends Locale ? Locale extends (typeof LOCALES)[number] ? true : never : never;
const _check: _Check = true;
void _check;
void KEYS_LOCALES;
void KEYS_DEFAULT;

export type AppLocale = Locale;
export { LOCALES, DEFAULT_LOCALE };
export const isRtl = (l: AppLocale): boolean => l === 'ar';
export const dirOf = (l: AppLocale): 'rtl' | 'ltr' => (isRtl(l) ? 'rtl' : 'ltr');
