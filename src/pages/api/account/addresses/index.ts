import type { APIRoute } from 'astro';

import { isSameOriginRequest, readForm, redirect } from '../../../../lib/server/http';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';
import { addressSchema } from '../../../../lib/server/validation';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  if (!context.locals.user) return redirect('/account/sign-in');
  if (!isSameOriginRequest(context.request)) return new Response('Invalid request.', { status: 403 });

  try {
    const form = await readForm(context.request);
    const parsed = addressSchema.safeParse({
      label: form.get('label'),
      recipientName: form.get('recipientName'),
      line1: form.get('line1'),
      line2: form.get('line2'),
      city: form.get('city'),
      county: form.get('county'),
      postcode: form.get('postcode'),
      countryCode: form.get('countryCode'),
      isDefault: form.get('isDefault') === 'true',
    });
    if (!parsed.success) return redirect('/account/addresses/new?error=invalid');

    const admin = createSupabaseAdmin();
    const { error } = await admin.schema('private').rpc('create_customer_address', {
      p_user_id: context.locals.user.id,
      p_label: parsed.data.label,
      p_recipient_name: parsed.data.recipientName,
      p_line_1: parsed.data.line1,
      p_line_2: parsed.data.line2,
      p_city: parsed.data.city,
      p_county: parsed.data.county,
      p_postcode: parsed.data.postcode,
      p_country_code: parsed.data.countryCode,
      p_is_default: parsed.data.isDefault,
    });

    return error ? redirect('/account/addresses/new?error=unavailable') : redirect('/account/addresses?created=1');
  } catch {
    return redirect('/account/addresses/new?error=unavailable');
  }
};
