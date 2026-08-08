import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../../lib/server/admin-http';
import { collectionAdminSchema } from '../../../../lib/server/admin-validation';
import { uuidSchema } from '../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = collectionAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!id.success || !parsed.success) return adminResultRedirect('/admin/collections', 'error');
  const result = await updateVersionedRecord('collections', id.data, parsed.data.version, {
    name: parsed.data.name, slug: parsed.data.slug, eyebrow: parsed.data.eyebrow,
    description: parsed.data.description, image_path: parsed.data.imagePath, image_alt: parsed.data.imageAlt,
    position: parsed.data.position, seo_title: parsed.data.seoTitle, seo_description: parsed.data.seoDescription,
  });
  if (result.status !== 'updated') return adminResultRedirect('/admin/collections', result.status === 'conflict' ? 'conflict' : 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'collection.updated', 'collection', id.data);
  return adminResultRedirect('/admin/collections');
};
