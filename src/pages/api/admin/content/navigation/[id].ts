import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../../../lib/server/admin-http';
import { navigationAdminSchema } from '../../../../../lib/server/admin-validation';
import { uuidSchema } from '../../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = navigationAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!id.success || !parsed.success) return adminResultRedirect('/admin/content', 'error');
  const result = await updateVersionedRecord('navigation_items', id.data, parsed.data.version, {
    label: parsed.data.label, href: parsed.data.href, position: parsed.data.position,
  });
  if (result.status !== 'updated') return adminResultRedirect('/admin/content', result.status === 'conflict' ? 'conflict' : 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'navigation.updated', 'navigation_item', id.data);
  return adminResultRedirect('/admin/content');
};
