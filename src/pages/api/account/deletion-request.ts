import type { APIRoute } from 'astro';

import { isSameOriginRequest, readForm, redirect } from '../../../lib/server/http';
import { createSupabaseAdmin } from '../../../lib/server/supabase';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  const user = context.locals.user;
  if (!user?.email) return redirect('/account/sign-in');
  if (!isSameOriginRequest(context.request)) return new Response('Invalid request.', { status: 403 });

  try {
    const form = await readForm(context.request);
    if (form.get('confirmed') !== 'true') return redirect('/account/delete?error=confirmation');

    const admin = createSupabaseAdmin();
    const { data: existing, error: readError } = await admin
      .schema('private')
      .from('account_deletion_requests')
      .select('id')
      .eq('user_id', user.id)
      .eq('status', 'pending')
      .maybeSingle();
    if (readError) return redirect('/account/delete?error=unavailable');

    if (!existing) {
      const { error } = await admin.schema('private').from('account_deletion_requests').insert({
        user_id: user.id,
        customer_email: user.email,
      });
      if (error && error.code !== '23505') return redirect('/account/delete?error=unavailable');
    }

    return redirect('/account/delete?requested=1');
  } catch {
    return redirect('/account/delete?error=unavailable');
  }
};
