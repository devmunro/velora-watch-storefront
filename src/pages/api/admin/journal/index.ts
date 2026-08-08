import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect } from '../../../../lib/server/admin-http';
import { journalAdminSchema } from '../../../../lib/server/admin-validation';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const parsed = journalAdminSchema.safeParse(Object.fromEntries(request.form));
  if (!parsed.success) return adminResultRedirect('/admin/journal', 'error');
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('journal_posts').insert({
    title: parsed.data.title, slug: parsed.data.slug, excerpt: parsed.data.excerpt, body: parsed.data.body,
    image_path: parsed.data.imagePath, image_alt: parsed.data.imageAlt,
    seo_title: parsed.data.seoTitle, seo_description: parsed.data.seoDescription, status: 'draft',
  }).select('id').single();
  if (error) return adminResultRedirect('/admin/journal', 'error');
  await writeAudit(request.authorization.user.id, request.authorization.role, 'journal.created', 'journal_post', data.id);
  return adminResultRedirect('/admin/journal');
};
