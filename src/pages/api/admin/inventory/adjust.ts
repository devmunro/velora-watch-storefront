import type { APIRoute } from 'astro';

import { beginAdminMutation, adminResultRedirect } from '../../../../lib/server/admin-http';
import { inventoryAdjustmentSchema } from '../../../../lib/server/admin-validation';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'fulfilment']);
  if ('response' in request) return request.response;
  const parsed = inventoryAdjustmentSchema.safeParse(Object.fromEntries(request.form));
  if (!parsed.success) return adminResultRedirect('/admin/inventory', 'error');
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.schema('private').rpc('adjust_inventory', {
    p_actor_user_id: request.authorization.user.id,
    p_actor_role: request.authorization.role,
    p_variant_id: parsed.data.variantId,
    p_delta: parsed.data.delta,
    p_low_stock_threshold: parsed.data.lowStockThreshold,
    p_note: parsed.data.note,
    p_version: parsed.data.version,
  });
  if (error) return adminResultRedirect('/admin/inventory', 'error');
  return data === true ? adminResultRedirect('/admin/inventory') : adminResultRedirect('/admin/inventory', 'conflict');
};
