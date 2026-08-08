import type { APIRoute } from 'astro';

import { getPublicContent } from '../lib/server/content';

export const prerender = false;

function escapeXml(value: string) {
  return value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
}

export const GET: APIRoute = async ({ url }) => {
  const content = await getPublicContent();
  const paths = new Set([
    '/',
    '/about',
    '/accessories',
    '/collections',
    '/journal',
    '/watches',
    ...content.collections.map((collection) => `/collections/${collection.slug}`),
    ...content.journalPosts.map((post) => `/journal/${post.slug}`),
    ...content.policies.map((policy) => `/policies/${policy.slug}`),
    ...content.products.map((product) => `/watches/${product.slug}`),
  ]);
  const urls = [...paths]
    .sort()
    .map((path) => `<url><loc>${escapeXml(new URL(path, url.origin).toString())}</loc></url>`)
    .join('');

  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls}</urlset>`, {
    headers: { 'Content-Type': 'application/xml; charset=utf-8' },
  });
};
