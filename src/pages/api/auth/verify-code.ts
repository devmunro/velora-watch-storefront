import type { APIRoute } from 'astro';
import { z } from 'zod';

import {
  clearAuthAttemptCookies,
  isSameOriginRequest,
  readForm,
  redirect,
  safeReturnPath,
} from '../../../lib/server/http';
import { createRequestSupabase } from '../../../lib/server/supabase';

export const prerender = false;

const codeSchema = z.string().regex(/^\d{6}$/);

export const POST: APIRoute = async (context) => {
  if (!isSameOriginRequest(context.request)) {
    return new Response('Invalid request.', { status: 403 });
  }

  try {
    const form = await readForm(context.request);
    const parsedCode = codeSchema.safeParse(form.get('code'));
    const email = context.cookies.get('velora_otp_email')?.value;

    if (!parsedCode.success || !email) {
      return redirect('/account/sign-in?error=invalid-code');
    }

    const supabase = createRequestSupabase(context);
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: parsedCode.data,
      type: 'email',
    });

    if (error) {
      return redirect('/account/sign-in?sent=1&error=invalid-code');
    }

    const returnTo = safeReturnPath(context.cookies.get('velora_return_to')?.value);
    clearAuthAttemptCookies(context);
    return redirect(returnTo);
  } catch {
    return redirect('/account/sign-in?error=unavailable');
  }
};
