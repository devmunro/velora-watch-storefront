import type { APIRoute } from 'astro';

import { isSameOriginRequest, readForm, redirect } from '../../../lib/server/http';
import { createRequestSupabase } from '../../../lib/server/supabase';
import { profileSchema } from '../../../lib/server/validation';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  if (!context.locals.user) return redirect('/account/sign-in');
  if (!isSameOriginRequest(context.request)) return new Response('Invalid request.', { status: 403 });

  try {
    const form = await readForm(context.request);
    const parsed = profileSchema.safeParse({
      firstName: form.get('firstName'),
      lastName: form.get('lastName'),
      phone: form.get('phone'),
      version: form.get('version'),
    });
    if (!parsed.success) return redirect('/account/profile?error=invalid');

    const supabase = createRequestSupabase(context);
    const values = {
      first_name: parsed.data.firstName,
      last_name: parsed.data.lastName,
      phone: parsed.data.phone,
    };
    const { data: current, error: readError } = await supabase
      .from('profiles')
      .select('version')
      .eq('user_id', context.locals.user.id)
      .maybeSingle();
    if (readError) return redirect('/account/profile?error=unavailable');

    if (!current) {
      const { error } = await supabase.from('profiles').insert({
        user_id: context.locals.user.id,
        ...values,
      });
      return error ? redirect('/account/profile?error=unavailable') : redirect('/account/profile?updated=1');
    }

    if (current.version !== parsed.data.version) return redirect('/account/profile?error=conflict');
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...values, version: parsed.data.version + 1 })
      .eq('user_id', context.locals.user.id)
      .eq('version', parsed.data.version)
      .select('version')
      .maybeSingle();

    if (error) return redirect('/account/profile?error=unavailable');
    if (!data) return redirect('/account/profile?error=conflict');
    return redirect('/account/profile?updated=1');
  } catch {
    return redirect('/account/profile?error=unavailable');
  }
};
