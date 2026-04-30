/**
 * Stub sitemap. Phase 2 marketing replaces this with a dynamic, locale-aware
 * sitemap index that pulls slugs from the API. For now we emit the static
 * top-level routes for each locale so the site is at least crawlable.
 */
import type { APIRoute } from 'astro';
import { LOCALES } from '~/lib/locales';
import { routes } from '~/lib/routes';

const TOP = (l: typeof LOCALES[number]) => [
  routes.home(l),
  routes.services(l),
  routes.conditions(l),
  routes.about(l),
  routes.blog(l),
  routes.faq(l),
  routes.contact(l),
  routes.kvkk(l),
  routes.accessibility(l),
];

export const GET: APIRoute = ({ site }) => {
  const base = (site?.toString() ?? 'https://uzmdroguzbak.com').replace(/\/$/, '');
  const urls = LOCALES.flatMap((l) => TOP(l).map((p) => `${base}${p}`));
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map((u) => `  <url><loc>${u}</loc></url>`),
    '</urlset>',
  ].join('\n');
  return new Response(xml, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
