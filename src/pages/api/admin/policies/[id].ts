import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../../lib/server/admin-http';
import { policyAdminSchema } from '../../../../lib/server/admin-validation';
import { uuidSchema } from '../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = policyAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!id.success || !parsed.success || !parsed.data.version) return adminResultRedirect('/admin/policies', 'error');
  const result = await updateVersionedRecord('policy_pages', id.data, parsed.data.version, {
    title: parsed.data.title, slug: parsed.data.slug, body: parsed.data.body,
  });
  if (result.status !== 'updated') return adminResultRedirect('/admin/policies', result.status === 'conflict' ? 'conflict' : 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'policy.updated', 'policy_page', id.data);
  return adminResultRedirect('/admin/policies');
};
