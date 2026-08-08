import type { APIRoute } from 'astro';

import { beginAdminMutation, adminResultRedirect } from '../../../../lib/server/admin-http';
import { settingsAdminSchema } from '../../../../lib/server/admin-validation';
import { writeAudit } from '../../../../lib/server/admin';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner']);
  if ('response' in request) return request.response;
  const parsed = settingsAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!parsed.success) return adminResultRedirect('/admin/content', 'error');
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('site_settings').update({
    announcement: parsed.data.announcement,
    free_shipping_threshold: parsed.data.freeShippingThreshold,
    contact_email: parsed.data.contactEmail,
    default_seo_title: parsed.data.defaultSeoTitle,
    default_seo_description: parsed.data.defaultSeoDescription,
    version: parsed.data.version + 1,
  }).eq('singleton_key', 'primary').eq('version', parsed.data.version).select('id').maybeSingle();
  if (error) return adminResultRedirect('/admin/content', 'error');
  if (!data) return adminResultRedirect('/admin/content', 'conflict');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'settings.updated', 'site_settings', data.id);
  return adminResultRedirect('/admin/content');
};
