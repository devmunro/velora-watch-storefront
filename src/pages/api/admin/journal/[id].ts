import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../../lib/server/admin-http';
import { journalAdminSchema } from '../../../../lib/server/admin-validation';
import { uuidSchema } from '../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = journalAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!id.success || !parsed.success || !parsed.data.version) return adminResultRedirect('/admin/journal', 'error');
  const result = await updateVersionedRecord('journal_posts', id.data, parsed.data.version, {
    title: parsed.data.title, slug: parsed.data.slug, excerpt: parsed.data.excerpt, body: parsed.data.body,
    image_path: parsed.data.imagePath, image_alt: parsed.data.imageAlt,
    seo_title: parsed.data.seoTitle, seo_description: parsed.data.seoDescription,
  });
  if (result.status !== 'updated') return adminResultRedirect('/admin/journal', result.status === 'conflict' ? 'conflict' : 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'journal.updated', 'journal_post', id.data);
  return adminResultRedirect('/admin/journal');
};
