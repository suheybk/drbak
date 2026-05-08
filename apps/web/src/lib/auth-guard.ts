/**
 * Server-side auth guard for Astro page entries.
 *
 * Why this exists: Astro only honours `Astro.redirect()` from page-level
 * modules — calling it from a child component throws ResponseSentError
 * (`render-context.js:383`) because rendering of the parent page has
 * already started by then. So pages call `requireAuth` BEFORE rendering
 * any view, and pass the resolved `me` down as a prop.
 *
 * Returns either `{ me }` (caller renders the view) or `{ redirectTo }`
 * (caller calls `Astro.redirect(redirectTo)`).
 */
import { serverFetch } from './api';
import type { AppLocale } from './locales';
import { routes } from './routes';

export type Me = {
  userId: string;
  emailVerified: boolean;
  /** Server returns this on /auth/me; treat as opaque string for now. */
  role?: string;
  /** Display email for header / portal — server returns this on /auth/me. */
  email?: string;
};

export type AuthGuardResult = { me: Me } | { redirectTo: string };

export const requireAuth = async (
  request: Request,
  locale: AppLocale,
  /** Path to return to after login (e.g. routes.book(locale)). */
  next: string,
): Promise<AuthGuardResult> => {
  const r = await serverFetch<Me>(request, '/auth/me');
  if (!r.ok) {
    return { redirectTo: `${routes.login(locale)}?next=${encodeURIComponent(next)}` };
  }
  return { me: r.value };
};

/**
 * Non-redirecting variant — used by the layout/header to render
 * "Hesabım" + email when the visitor has a session, and the "Giriş"
 * call-to-action when they don't.
 */
export const getOptionalAuth = async (request: Request): Promise<Me | null> => {
  const r = await serverFetch<Me>(request, '/auth/me');
  return r.ok ? r.value : null;
};
