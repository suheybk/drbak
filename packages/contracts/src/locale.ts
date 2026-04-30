import { z } from 'zod';

export const LOCALES = ['tr', 'ar', 'en', 'fr', 'es'] as const;
export const DEFAULT_LOCALE = 'tr' as const;
export const RTL_LOCALES = new Set(['ar']);

export const LocaleSchema = z.enum(LOCALES);
export type Locale = z.infer<typeof LocaleSchema>;

export const isRtl = (locale: Locale): boolean => RTL_LOCALES.has(locale);
