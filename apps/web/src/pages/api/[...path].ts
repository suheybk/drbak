import type { APIRoute } from 'astro';

/**
 * Reverse proxy: forwards every `/api/*` request from the web origin to the
 * separate API Worker. Lets the web + API share one origin in staging
 * (`dr-bak-web-staging.pages.dev`) so `SameSite=Strict` auth cookies work,
 * and keeps the same shape in production once `staging.uzmdroguzbak.com` /
 * `api-staging.uzmdroguzbak.com` are wired (at which point this endpoint
 * still works but becomes redundant).
 *
 * Reads `API_ORIGIN` from `Astro.locals.runtime.env` — set in
 * `apps/web/wrangler.toml [vars]`. Pass-through is verbatim: method,
 * headers, body, query string, and 3xx redirects with their `Set-Cookie`
 * headers all flow back to the browser unchanged.
 */
export const prerender = false;

export const ALL: APIRoute = async ({ request, locals }) => {
  const apiOrigin = locals.runtime.env.API_ORIGIN;
  if (!apiOrigin) {
    return new Response('API_ORIGIN not configured for this deployment.', {
      status: 500,
    });
  }

  const url = new URL(request.url);
  const target = new URL(url.pathname + url.search, apiOrigin);

  const init: RequestInit & { redirect: 'manual' } = {
    method: request.method,
    headers: request.headers,
    redirect: 'manual',
  };
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    init.body = request.body;
  }

  return fetch(new Request(target, init));
};
