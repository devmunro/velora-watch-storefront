import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect } from '../../../../lib/server/admin-http';
import { staffAdminSchema } from '../../../../lib/server/admin-validation';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner']);
  if ('response' in request) return request.response;
  const parsed = staffAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!parsed.success) return adminResultRedirect('/admin/staff', 'error');
  const admin = createSupabaseAdmin();
  const { data: users, error: userError } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (userError) return adminResultRedirect('/admin/staff', 'error');
  const user = users.users.find((entry) => entry.email?.toLowerCase() === parsed.data.email);
  if (!user) return adminResultRedirect('/admin/staff', 'not-found');
  const { error } = await admin.schema('private').from('staff_members').insert({
    user_id: user.id,
    role: parsed.data.role,
    active: true,
    created_by: request.authorization.user.id,
  });
  if (error) return adminResultRedirect('/admin/staff', 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'staff.access_granted', 'staff_member', user.id, { role: parsed.data.role });
  return adminResultRedirect('/admin/staff');
};
