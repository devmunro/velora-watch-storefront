import type { APIRoute } from 'astro';

import { writeAudit } from '../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect } from '../../../lib/server/admin-http';
import { onboardingAdminSchema } from '../../../lib/server/admin-validation';
import { createSupabaseAdmin } from '../../../lib/server/supabase';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor', 'fulfilment']);
  if ('response' in request) return request.response;
  const parsed = onboardingAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!parsed.success) return adminResultRedirect('/admin', 'error');
  const now = new Date().toISOString();
  const values = parsed.data.action === 'restart' ? { tour_completed_at: null, tour_dismissed_at: null }
    : parsed.data.action === 'complete' ? { tour_completed_at: now, tour_dismissed_at: null } : { tour_dismissed_at: now };
  const admin = createSupabaseAdmin();
  const { error } = await admin.schema('private').from('staff_preferences').upsert({ user_id: request.authorization.user.id, ...values }, { onConflict: 'user_id' });
  if (error) return adminResultRedirect('/admin', 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, `onboarding.${parsed.data.action}`, 'staff_preferences', null);
  return adminResultRedirect('/admin');
};
