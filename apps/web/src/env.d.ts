/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_API_BASE: string;
  readonly PUBLIC_BASE_URL: string;
  readonly DEFAULT_LOCALE: string;
  readonly SUPPORTED_LOCALES: string;
  readonly CONTACT_EMAIL: string;
  readonly CONTACT_PHONE_E164: string;
  readonly ENVIRONMENT: 'production' | 'preview' | 'dev';
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare namespace App {
  interface Locals {
    locale: import('@dr-bak/i18n-keys').Locale;
    runtime: {
      env: Record<string, string | undefined>;
    };
  }
}
