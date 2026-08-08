import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../../lib/server/admin-http';
import { variantAdminSchema } from '../../../../lib/server/admin-validation';
import { uuidSchema } from '../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = variantAdminSchema.safeParse(Object.fromEntries(request.form));
  const returnTo = `/admin/products/${request.form.get('productId')}`;
  if (!id.success || !parsed.success) return adminResultRedirect(returnTo, 'error');
  const result = await updateVersionedRecord('product_variants', id.data, parsed.data.version, {
    name: parsed.data.name, sku: parsed.data.sku, finish: parsed.data.finish, strap: parsed.data.strap, position: parsed.data.position,
  });
  if (result.status !== 'updated') return adminResultRedirect(returnTo, result.status === 'conflict' ? 'conflict' : 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'variant.updated', 'product_variant', id.data);
  return adminResultRedirect(returnTo);
};
