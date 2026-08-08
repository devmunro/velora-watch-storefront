import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect } from '../../../../lib/server/admin-http';
import { policyAdminSchema } from '../../../../lib/server/admin-validation';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const parsed = policyAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!parsed.success) return adminResultRedirect('/admin/policies', 'error');
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('policy_pages').insert({
    title: parsed.data.title, slug: parsed.data.slug, body: parsed.data.body, status: 'draft',
  }).select('id').single();
  if (error) return adminResultRedirect('/admin/policies', 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'policy.created', 'policy_page', data.id);
  return adminResultRedirect('/admin/policies');
};
