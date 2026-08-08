import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect } from '../../../../lib/server/admin-http';
import { staffUpdateSchema } from '../../../../lib/server/admin-validation';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner']);
  if ('response' in request) return request.response;
  const parsed = staffUpdateSchema.safeParse({ ...Object.fromEntries(request.form), active: request.form.get('active') === 'true' });
  if (!parsed.success) return adminResultRedirect('/admin/staff', 'error');
  const admin = createSupabaseAdmin();
  const { data: current, error: readError } = await admin.schema('private').from('staff_members')
    .select('role,active,version').eq('user_id', parsed.data.userId).maybeSingle();
  if (readError || !current) return adminResultRedirect('/admin/staff', 'error');
  if (current.version !== parsed.data.version) return adminResultRedirect('/admin/staff', 'conflict');
  if (current.role === 'owner' && current.active && (!parsed.data.active || parsed.data.role !== 'owner')) {
    const { count } = await admin.schema('private').from('staff_members').select('user_id', { count: 'exact', head: true }).eq('role', 'owner').eq('active', true);
    if ((count ?? 0) <= 1) return adminResultRedirect('/admin/staff', 'error');
  }
  const { data, error } = await admin.schema('private').from('staff_members').update({
    role: parsed.data.role, active: parsed.data.active, version: parsed.data.version + 1,
  }).eq('user_id', parsed.data.userId).eq('version', parsed.data.version).select('user_id').maybeSingle();
  if (error) return adminResultRedirect('/admin/staff', 'error');
  if (!data) return adminResultRedirect('/admin/staff', 'conflict');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'staff.access_updated', 'staff_member', parsed.data.userId, { role: parsed.data.role, active: parsed.data.active });
  return adminResultRedirect('/admin/staff');
};
