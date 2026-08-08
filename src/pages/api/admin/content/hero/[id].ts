import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../../../lib/server/admin-http';
import { heroAdminSchema } from '../../../../../lib/server/admin-validation';
import { uuidSchema } from '../../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = heroAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!id.success || !parsed.success) return adminResultRedirect('/admin/content', 'error');
  const result = await updateVersionedRecord('hero_slides', id.data, parsed.data.version, {
    eyebrow: parsed.data.eyebrow, title: parsed.data.title, accent: parsed.data.accent, body: parsed.data.body,
    primary_label: parsed.data.primaryLabel, primary_href: parsed.data.primaryHref,
    secondary_label: parsed.data.secondaryLabel, secondary_href: parsed.data.secondaryHref,
    media_path: parsed.data.mediaPath, media_alt: parsed.data.mediaAlt, position: parsed.data.position,
  });
  if (result.status !== 'updated') return adminResultRedirect('/admin/content', result.status === 'conflict' ? 'conflict' : 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'hero.updated', 'hero_slide', id.data);
  return adminResultRedirect('/admin/content');
};
