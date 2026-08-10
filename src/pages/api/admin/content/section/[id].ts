import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../../../lib/server/admin-http';
import { homepageSectionAdminSchema } from '../../../../../lib/server/admin-validation';
import { uuidSchema } from '../../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = homepageSectionAdminSchema.safeParse({ ...Object.fromEntries(request.form), visible: request.form.get('visible') === 'true' });
  if (!id.success || !parsed.success) return adminResultRedirect('/admin/content', 'error');
  const result = await updateVersionedRecord('homepage_sections', id.data, parsed.data.version, {
    eyebrow: parsed.data.eyebrow, heading: parsed.data.heading, accent: parsed.data.accent,
    body: parsed.data.body, media_path: parsed.data.mediaPath, media_alt: parsed.data.mediaAlt,
    primary_label: parsed.data.primaryLabel, primary_href: parsed.data.primaryHref,
    featured_product_id: parsed.data.featuredProductId, featured_collection_id: parsed.data.featuredCollectionId,
    featured_journal_post_id: parsed.data.featuredJournalPostId, position: parsed.data.position, visible: parsed.data.visible,
  });
  if (result.status !== 'updated') return adminResultRedirect('/admin/content', result.status === 'conflict' ? 'conflict' : 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'homepage.section_updated', 'homepage_section', id.data);
  return adminResultRedirect('/admin/content');
};
