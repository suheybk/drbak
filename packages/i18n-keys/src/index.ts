/**
 * Typed translation keys for Dr. Bak.
 *
 * Why this exists: every string visible to a patient or doctor passes through
 * `t('some.key')`. Mistyped keys silently render the key path; that is unsafe
 * in a clinical context (think: a missing consent line on a booking page).
 * `TranslationKey` makes typos a TypeScript error.
 *
 * Locales: tr (default) + ar (RTL) + en + fr + es. AR uses Western digits in
 * date/dose strings — see locales/ar.json.
 *
 * To add a key: append it to `KEYS`, then add the string to every locale JSON.
 */

import tr from './locales/tr.json' with { type: 'json' };

/** A leaf path like 'booking.cta' or 'errors.SLOT_CONFLICT'. */
export type TranslationKey = LeafPath<typeof tr>;

type LeafPath<T, P extends string = ''> = T extends string
  ? P extends `${infer Q}.`
    ? Q
    : P
  : T extends Record<string, unknown>
    ? {
        [K in keyof T & string]: LeafPath<T[K], `${P}${K}.`>;
      }[keyof T & string]
    : never;

export const LOCALES = ['tr', 'ar', 'en', 'fr', 'es'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'tr';
export const RTL_LOCALES: ReadonlySet<Locale> = new Set<Locale>(['ar']);

export const isRtl = (l: Locale): boolean => RTL_LOCALES.has(l);
export const dirOf = (l: Locale): 'rtl' | 'ltr' => (isRtl(l) ? 'rtl' : 'ltr');

/** Resolve a dotted key against a locale dictionary. Falls back to the key itself. */
export const resolveKey = (dict: Record<string, unknown>, key: string): string => {
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as Record<string, unknown>)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  return typeof cur === 'string' ? cur : key;
};

/** Tiny `{name}` interpolator — no MessageFormat dep on the edge. */
export const interpolate = (template: string, vars: Record<string, string | number> = {}): string =>
  template.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? String(vars[name]) : `{${name}}`));

/** AR uses Western digits in clinical contexts (dose, date, time). Force Latin. */
export const forceWesternDigits = (s: string): string =>
  s.replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 0x0660 + 0x30));

export type Dictionary = typeof tr;
