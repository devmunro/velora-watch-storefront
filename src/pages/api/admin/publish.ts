import type { APIRoute } from 'astro';

import { writeAudit } from '../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../lib/server/admin-http';
import { publishAdminSchema } from '../../../lib/server/admin-validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner']);
  if ('response' in request) return request.response;
  const parsed = publishAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!parsed.success) return adminResultRedirect('/admin', 'error');
  const values: Record<string, unknown> = { status: parsed.data.status };
  if (parsed.data.entity === 'journal_posts' && parsed.data.status === 'published') {
    values.published_at = new Date().toISOString();
  }
  const result = await updateVersionedRecord(parsed.data.entity, parsed.data.id, parsed.data.version, values);
  if (result.status !== 'updated') return adminResultRedirect(parsed.data.returnTo, result.status === 'conflict' ? 'conflict' : 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, `content.${parsed.data.status}`, parsed.data.entity, parsed.data.id);
  return adminResultRedirect(parsed.data.returnTo);
};
