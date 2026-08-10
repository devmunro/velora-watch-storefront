import { defineMiddleware } from 'astro:middleware';

import { canAccessAdminSection } from './lib/server/admin-permissions';
import { hasSupabaseConfiguration } from './lib/server/runtime-env';
import { createRequestSupabase, getStaffRole } from './lib/server/supabase';

const protectedAccountPath = /^\/account(?:\/|$)/;
const protectedCheckoutPath = /^\/checkout\/success(?:\/|$)/;
const publicAccountPaths = new Set(['/account/sign-in', '/admin/sign-in']);
function applySecurityHeaders(response: Response, request: Request, authenticated: boolean) {
  const headers = response.headers;
  const pathname = new URL(request.url).pathname;
  const isSensitive =
    authenticated ||
    ['/account', '/admin', '/api', '/cart', '/checkout'].some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    );

  headers.set(
    'Content-Security-Policy',
    "default-src 'self'; base-uri 'self'; connect-src 'self' https://*.supabase.co; font-src 'self'; form-action 'self'; frame-ancestors 'none'; img-src 'self' data: blob: https://*.supabase.co; object-src 'none'; script-src 'self'; style-src 'self' 'unsafe-inline'",
  );
  headers.set('Permissions-Policy', 'camera=(), geolocation=(), microphone=(), payment=()');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('X-Frame-Options', 'DENY');

  if (new URL(request.url).protocol === 'https:') {
    headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  headers.set(
    'Cache-Control',
    isSensitive ? 'private, no-store' : 'public, max-age=0, s-maxage=300, stale-while-revalidate=86400',
  );
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = context.url.pathname;
  const configured = hasSupabaseConfiguration();
  let user = null;
  let staffRole: App.Locals['staffRole'] = null;

  if (configured) {
    try {
      const supabase = createRequestSupabase(context);
      const { data } = await supabase.auth.getUser();
      user = data.user;

      if (user && (pathname.startsWith('/admin') || pathname.startsWith('/api/admin'))) {
        staffRole = await getStaffRole(user.id);
      }
    } catch {
      user = null;
      staffRole = null;
    }
  }

  context.locals.supabaseConfigured = configured;
  context.locals.user = user;
  context.locals.staffRole = staffRole;

  if (protectedAccountPath.test(pathname) && !publicAccountPaths.has(pathname) && !user) {
    const returnTo = encodeURIComponent(`${pathname}${context.url.search}`);
    return context.redirect(`/account/sign-in?returnTo=${returnTo}`, 307);
  }

  if (protectedCheckoutPath.test(pathname) && !user) {
    const returnTo = encodeURIComponent(`${pathname}${context.url.search}`);
    return context.redirect(`/account/sign-in?returnTo=${returnTo}`, 307);
  }

  if (pathname.startsWith('/admin') && !user && pathname !== '/admin/sign-in') {
    const returnTo = encodeURIComponent(`${pathname}${context.url.search}`);
    return context.redirect(`/account/sign-in?returnTo=${returnTo}`, 307);
  }

  if (pathname.startsWith('/api/admin') && !user) {
    return new Response(JSON.stringify({ error: 'Authentication required.' }), {
      headers: { 'Content-Type': 'application/json' },
      status: 401,
    });
  }

  if ((pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) && user && !staffRole) {
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Administrative access is required.' }), {
        headers: { 'Content-Type': 'application/json' },
        status: 403,
      });
    }
    return context.redirect('/admin/sign-in?error=not-authorized', 303);
  }

  if (pathname.startsWith('/admin/') && staffRole) {
    const section = pathname.split('/')[2] ?? '';
    if (!canAccessAdminSection(staffRole, section)) {
      return context.redirect('/admin?access=denied', 303);
    }
  }

  const response = await next();
  applySecurityHeaders(response, context.request, Boolean(user));
  return response;
});
