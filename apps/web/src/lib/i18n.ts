/**
 * Server-side i18n loader.
 *
 * Astro pages call `loadDict(locale)` to get the JSON dictionary, then expose
 * `t(key, vars?)` to templates. Hydrated React islands receive the dictionary
 * as a prop and use `useTranslator(dict, locale)` to build their own `t`.
 *
 * Why this shape: keeping the JSON outside React/Astro keeps the bundle small
 * (each locale ships only its own JSON), and the typed `TranslationKey` from
 * @dr-bak/i18n-keys means missing keys are caught at build time.
 */
import {
  type Locale,
  type TranslationKey,
  interpolate,
  resolveKey,
} from '@dr-bak/i18n-keys';

import tr from '@dr-bak/i18n-keys/locales/tr.json' with { type: 'json' };
import ar from '@dr-bak/i18n-keys/locales/ar.json' with { type: 'json' };
import en from '@dr-bak/i18n-keys/locales/en.json' with { type: 'json' };
import fr from '@dr-bak/i18n-keys/locales/fr.json' with { type: 'json' };
import es from '@dr-bak/i18n-keys/locales/es.json' with { type: 'json' };

const DICTS: Record<Locale, Record<string, unknown>> = {
  tr: tr as never,
  ar: ar as never,
  en: en as never,
  fr: fr as never,
  es: es as never,
};

export const loadDict = (locale: Locale): Record<string, unknown> => DICTS[locale];

export type ServerTranslator = (key: TranslationKey, vars?: Record<string, string | number>) => string;

export const buildT = (locale: Locale): ServerTranslator => {
  const dict = DICTS[locale];
  return (key, vars) => interpolate(resolveKey(dict, key), vars);
};
