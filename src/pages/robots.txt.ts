import type { APIRoute } from 'astro';

export const prerender = false;

export const GET: APIRoute = ({ url }) => {
  const sitemap = new URL('/sitemap.xml', url.origin);
  return new Response(`User-agent: *\nAllow: /\nDisallow: /account\nDisallow: /admin\nSitemap: ${sitemap}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
