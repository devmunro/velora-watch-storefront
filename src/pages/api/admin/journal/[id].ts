import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect, updateVersionedRecord } from '../../../../lib/server/admin-http';
import { journalAdminSchema } from '../../../../lib/server/admin-validation';
import { uuidSchema } from '../../../../lib/server/validation';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';
import { estimateReadingMinutes } from '../../../../lib/server/markdown';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner', 'editor']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const parsed = journalAdminSchema.safeParse({ ...Object.fromEntries(request.form), featured: request.form.get('featured') === 'true', relatedProductIds: request.form.getAll('relatedProductIds') });
  const returnTo = id.success ? `/admin/journal/${id.data}` : '/admin/journal';
  if (!id.success || !parsed.success || !parsed.data.version) return adminResultRedirect(returnTo, 'error');
  const result = await updateVersionedRecord('journal_posts', id.data, parsed.data.version, {
    title: parsed.data.title, slug: parsed.data.slug, excerpt: parsed.data.excerpt, body: parsed.data.body,
    image_path: parsed.data.imagePath, image_alt: parsed.data.imageAlt,
    seo_title: parsed.data.seoTitle, seo_description: parsed.data.seoDescription,
    author_name: parsed.data.authorName, category_id: parsed.data.categoryId, featured: parsed.data.featured,
    reading_minutes: estimateReadingMinutes(parsed.data.body),
  });
  if (result.status !== 'updated') return adminResultRedirect(returnTo, result.status === 'conflict' ? 'conflict' : 'error');
  const admin = createSupabaseAdmin();
  const { error: deleteError } = await admin.from('journal_post_products').delete().eq('journal_post_id', id.data);
  if (deleteError) return adminResultRedirect(returnTo, 'error');
  if (parsed.data.relatedProductIds.length) {
    const { error: relationError } = await admin.from('journal_post_products').insert(parsed.data.relatedProductIds.map((productId, position) => ({ journal_post_id: id.data, product_id: productId, position })));
    if (relationError) return adminResultRedirect(returnTo, 'error');
  }
  await writeAudit(request.authorization.user.id, request.authorization.role, 'journal.updated', 'journal_post', id.data);
  return adminResultRedirect(returnTo);
};
