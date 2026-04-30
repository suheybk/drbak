import { type Locale, type TranslationKey, interpolate, resolveKey } from '@dr-bak/i18n-keys';
import { useMemo } from 'react';

export type Translator = (key: TranslationKey, vars?: Record<string, string | number>) => string;

/**
 * Build a memoised `t(key)` from a dictionary that was loaded server-side
 * (Astro fetches the JSON on the server, hydrates this island with it).
 */
export const useTranslator = (dict: Record<string, unknown>, _locale: Locale): Translator => {
  return useMemo(() => (key, vars) => interpolate(resolveKey(dict, key), vars), [dict]);
};
