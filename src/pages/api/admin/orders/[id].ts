import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect } from '../../../../lib/server/admin-http';
import { orderFulfilmentSchema } from '../../../../lib/server/admin-validation';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';
import { uuidSchema } from '../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'fulfilment']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = orderFulfilmentSchema.safeParse(Object.fromEntries(request.form));
  const returnTo = `/admin/orders/${context.params.id}`;
  if (!id.success || !parsed.success) return adminResultRedirect(returnTo, 'error');
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('orders').update({
    status: parsed.data.status,
    tracking_number: parsed.data.trackingNumber,
    tracking_url: parsed.data.trackingUrl,
    version: parsed.data.version + 1,
  }).eq('id', id.data).eq('version', parsed.data.version).select('id').maybeSingle();
  if (error) return adminResultRedirect(returnTo, 'error');
  if (!data) return adminResultRedirect(returnTo, 'conflict');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'order.fulfilment_updated', 'order', id.data, {
    status: parsed.data.status,
    tracking_present: Boolean(parsed.data.trackingNumber),
  });
  return adminResultRedirect(returnTo);
};
