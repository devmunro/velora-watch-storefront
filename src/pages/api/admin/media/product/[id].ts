import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../../../lib/server/admin-http';
import { productMediaAdminSchema } from '../../../../../lib/server/admin-validation';
import { uuidSchema } from '../../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = productMediaAdminSchema.safeParse(Object.fromEntries(request.form));
  const productId = uuidSchema.safeParse(request.form.get('productId'));
  const returnTo = productId.success ? `/admin/products/${productId.data}` : '/admin/products';
  if (!id.success || !parsed.success) return adminResultRedirect(returnTo, 'error');
  const result = await updateVersionedRecord('product_media', id.data, parsed.data.version, {
    alt_text: parsed.data.altText, position: parsed.data.position,
  });
  if (result.status !== 'updated') return adminResultRedirect(returnTo, result.status === 'conflict' ? 'conflict' : 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'media.metadata_updated', 'product_media', id.data);
  return adminResultRedirect(returnTo);
};
