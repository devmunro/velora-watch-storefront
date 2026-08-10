import type { APIRoute } from 'astro';

import { safeReturnPath, redirect } from '../../lib/server/http';
import { createRequestSupabase } from '../../lib/server/supabase';

export const prerender = false;

export const GET: APIRoute = async (context) => {
  const code = context.url.searchParams.get('code');
  const returnTo = safeReturnPath(context.url.searchParams.get('returnTo'));

  if (!code) return redirect('/account/sign-in?error=invalid-link');

  try {
    const supabase = createRequestSupabase(context);
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) return redirect('/account/sign-in?error=invalid-link');
    return redirect(returnTo);
  } catch {
    return redirect('/account/sign-in?error=unavailable');
  }
};
