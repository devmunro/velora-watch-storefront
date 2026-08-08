import type { APIRoute } from 'astro';
import { z } from 'zod';

import { isSameOriginRequest, readForm, redirect, safeReturnPath } from '../../../lib/server/http';
import { createRequestSupabase } from '../../../lib/server/supabase';

export const prerender = false;

const requestSchema = z.object({
  email: z.email().max(254).transform((value) => value.trim().toLowerCase()),
  returnTo: z.string().optional(),
});

export const POST: APIRoute = async (context) => {
  if (!isSameOriginRequest(context.request)) {
    return new Response('Invalid request.', { status: 403 });
  }

  try {
    const form = await readForm(context.request);
    const parsed = requestSchema.safeParse({
      email: form.get('email'),
      returnTo: form.get('returnTo')?.toString(),
    });

    if (!parsed.success) {
      return redirect('/account/sign-in?error=invalid-email');
    }

    const returnTo = safeReturnPath(parsed.data.returnTo);
    const supabase = createRequestSupabase(context);
    const { error } = await supabase.auth.signInWithOtp({
      email: parsed.data.email,
      options: { shouldCreateUser: true },
    });

    if (error) {
      return redirect('/account/sign-in?error=code-request');
    }

    const secure = import.meta.env.PROD;
    context.cookies.set('velora_otp_email', parsed.data.email, {
      httpOnly: true,
      maxAge: 600,
      path: '/',
      sameSite: 'lax',
      secure,
    });
    context.cookies.set('velora_return_to', returnTo, {
      httpOnly: true,
      maxAge: 600,
      path: '/',
      sameSite: 'lax',
      secure,
    });

    return redirect('/account/sign-in?sent=1');
  } catch {
    return redirect('/account/sign-in?error=unavailable');
  }
};
