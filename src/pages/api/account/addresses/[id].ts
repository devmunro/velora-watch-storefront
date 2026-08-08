import type { APIRoute } from 'astro';

import { isSameOriginRequest, readForm, redirect } from '../../../../lib/server/http';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';
import { addressSchema, uuidSchema, versionSchema } from '../../../../lib/server/validation';

export const prerender = false;

export const POST: APIRoute = async (context) => {
  if (!context.locals.user) return redirect('/account/sign-in');
  if (!isSameOriginRequest(context.request)) return new Response('Invalid request.', { status: 403 });

  const addressId = uuidSchema.safeParse(context.params.id);
  if (!addressId.success) return redirect('/account/addresses?error=not-found');

  try {
    const form = await readForm(context.request);
    const version = versionSchema.safeParse(form.get('version'));
    if (!version.success) return redirect(`/account/addresses/${addressId.data}?error=invalid`);
    const admin = createSupabaseAdmin();

    if (form.get('action') === 'delete') {
      const { data, error } = await admin.schema('private').rpc('delete_customer_address', {
        p_user_id: context.locals.user.id,
        p_address_id: addressId.data,
        p_version: version.data,
      });
      if (error) return redirect('/account/addresses?error=unavailable');
      return data === true
        ? redirect('/account/addresses?removed=1')
        : redirect('/account/addresses?error=conflict');
    }

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
    if (!parsed.success) return redirect(`/account/addresses/${addressId.data}?error=invalid`);

    const { data, error } = await admin.schema('private').rpc('update_customer_address', {
      p_user_id: context.locals.user.id,
      p_address_id: addressId.data,
      p_version: version.data,
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
    if (error) return redirect(`/account/addresses/${addressId.data}?error=unavailable`);
    return data === true
      ? redirect('/account/addresses?updated=1')
      : redirect(`/account/addresses/${addressId.data}?error=conflict`);
  } catch {
    return redirect(`/account/addresses/${addressId.data}?error=unavailable`);
  }
};
