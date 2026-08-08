import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../../lib/server/admin-http';
import { productAdminSchema } from '../../../../lib/server/admin-validation';
import { uuidSchema } from '../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const formValues = { ...Object.fromEntries(request.form), featured: request.form.get('featured') === 'true' };
  const parsed = productAdminSchema.safeParse(formValues);
  if (!id.success || !parsed.success) return adminResultRedirect(`/admin/products/${context.params.id}`, 'error');
  let specifications: unknown;
  try { specifications = JSON.parse(parsed.data.specifications); } catch { return adminResultRedirect(`/admin/products/${id.data}`, 'error'); }
  if (!specifications || typeof specifications !== 'object' || Array.isArray(specifications)) return adminResultRedirect(`/admin/products/${id.data}`, 'error');
  const result = await updateVersionedRecord('products', id.data, parsed.data.version, {
    name: parsed.data.name, slug: parsed.data.slug, collection_id: parsed.data.collectionId,
    short_description: parsed.data.shortDescription, description: parsed.data.description,
    specifications, primary_image_path: parsed.data.primaryImagePath, primary_image_alt: parsed.data.primaryImageAlt,
    seo_title: parsed.data.seoTitle, seo_description: parsed.data.seoDescription,
    featured: parsed.data.featured, position: parsed.data.position,
  });
  if (result.status !== 'updated') return adminResultRedirect(`/admin/products/${id.data}`, result.status === 'conflict' ? 'conflict' : 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'product.updated', 'product', id.data);
  return adminResultRedirect(`/admin/products/${id.data}`);
};
