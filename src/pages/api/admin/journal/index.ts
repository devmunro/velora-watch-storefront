import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect } from '../../../../lib/server/admin-http';
import { journalAdminSchema } from '../../../../lib/server/admin-validation';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';
import { estimateReadingMinutes } from '../../../../lib/server/markdown';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const parsed = journalAdminSchema.safeParse({ ...Object.fromEntries(request.form), featured: request.form.get('featured') === 'true', relatedProductIds: request.form.getAll('relatedProductIds') });
  if (!parsed.success) return adminResultRedirect('/admin/journal', 'error');
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.from('journal_posts').insert({
    title: parsed.data.title, slug: parsed.data.slug, excerpt: parsed.data.excerpt, body: parsed.data.body,
    image_path: parsed.data.imagePath, image_alt: parsed.data.imageAlt,
    seo_title: parsed.data.seoTitle, seo_description: parsed.data.seoDescription, status: 'draft',
    author_name: parsed.data.authorName, category_id: parsed.data.categoryId, featured: parsed.data.featured,
    reading_minutes: estimateReadingMinutes(parsed.data.body),
  }).select('id').single();
  if (error) return adminResultRedirect('/admin/journal', 'error');
  if (parsed.data.relatedProductIds.length) {
    const { error: relationError } = await admin.from('journal_post_products').insert(parsed.data.relatedProductIds.map((productId, position) => ({ journal_post_id: data.id, product_id: productId, position })));
    if (relationError) return adminResultRedirect(`/admin/journal/${data.id}`, 'error');
  }
  await writeAudit(request.authorization.user.id, request.authorization.role, 'journal.created', 'journal_post', data.id);
  return adminResultRedirect(`/admin/journal/${data.id}`);
};
