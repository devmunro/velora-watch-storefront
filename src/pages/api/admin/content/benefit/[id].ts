import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../../../lib/server/admin-http';
import { benefitAdminSchema } from '../../../../../lib/server/admin-validation';
import { uuidSchema } from '../../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = benefitAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!id.success || !parsed.success) return adminResultRedirect('/admin/content', 'error');
  const result = await updateVersionedRecord('benefits', id.data, parsed.data.version, {
    title: parsed.data.title, body: parsed.data.body, icon: parsed.data.icon, position: parsed.data.position,
  });
  if (result.status !== 'updated') return adminResultRedirect('/admin/content', result.status === 'conflict' ? 'conflict' : 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'benefit.updated', 'benefit', id.data);
  return adminResultRedirect('/admin/content');
};
