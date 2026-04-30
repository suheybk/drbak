import { LOCALES, type Locale } from '@dr-bak/i18n-keys';

export type LocaleSwitcherProps = {
  current: Locale;
  /** Reciprocal hrefs by locale. Astro builds these on the server. */
  localeHrefs: Record<Locale, string>;
  label: string;
};

const NAMES: Record<Locale, string> = {
  tr: 'Türkçe',
  ar: 'العربية',
  en: 'English',
  fr: 'Français',
  es: 'Español',
};

export const LocaleSwitcher = ({ current, localeHrefs, label }: LocaleSwitcherProps) => (
  <nav aria-label={label} className="drb-localesw">
    <ul>
      {LOCALES.map((l) => (
        <li key={l}>
          <a
            href={localeHrefs[l]}
            hrefLang={l}
            lang={l}
            aria-current={l === current ? 'page' : undefined}
            className="drb-localesw__link"
          >
            {NAMES[l]}
          </a>
        </li>
      ))}
    </ul>
  </nav>
);
