import type { APIRoute } from 'astro';

import { isSameOriginRequest, redirect } from '../../../lib/server/http';
import { createRequestSupabase } from '../../../lib/server/supabase';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  if (!isSameOriginRequest(context.request)) {
    return new Response('Invalid request.', { status: 403 });
  }

  try {
    const supabase = createRequestSupabase(context);
    await supabase.auth.signOut({ scope: 'local' });
  } catch {
    // The local session is still cleared by the response cookie handlers when available.
  }

  return redirect('/');
};
