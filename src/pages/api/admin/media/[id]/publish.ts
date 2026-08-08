import type { APIRoute } from 'astro';

import { writeAudit } from '../../../../../lib/server/admin';
import { beginAdminMutation, adminResultRedirect } from '../../../../../lib/server/admin-http';
import { createSupabaseAdmin } from '../../../../../lib/server/supabase';
import { uuidSchema, versionSchema } from '../../../../../lib/server/validation';

export const POST: APIRoute = async (context) => {
  const request = await beginAdminMutation(context, ['owner']);
  if ('response' in request) return request.response;
  const id = uuidSchema.safeParse(context.params.id);
  const version = versionSchema.safeParse(request.form.get('version'));
  if (!id.success || !version.success) return adminResultRedirect('/admin/media', 'error');
  const admin = createSupabaseAdmin();
  const { data: upload, error: readError } = await admin.schema('private').from('media_uploads')
    .select('*').eq('id', id.data).eq('status', 'staged').eq('version', version.data).maybeSingle();
  if (readError) return adminResultRedirect('/admin/media', 'error');
  if (!upload) return adminResultRedirect('/admin/media', 'conflict');
  const { data: file, error: downloadError } = await admin.storage.from('cms-staging').download(upload.staging_path);
  if (downloadError || !file || file.size > 10_485_760 || file.size < 1) return adminResultRedirect('/admin/media', 'error');
  const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[upload.mime_type as 'image/jpeg' | 'image/png' | 'image/webp'];
  const cataloguePath = `${upload.product_id ? `products/${upload.product_id}` : 'editorial'}/${upload.id}.${extension}`;
  const { error: uploadError } = await admin.storage.from('catalogue').upload(cataloguePath, file, {
    cacheControl: '31536000', contentType: upload.mime_type, upsert: false,
  });
  if (uploadError) return adminResultRedirect('/admin/media', 'error');

  let productMediaId: string | null = null;
  if (upload.product_id) {
    const { data: mediaRecord, error: mediaError } = await admin.from('product_media').insert({
      product_id: upload.product_id, storage_path: cataloguePath, alt_text: upload.alt_text, status: 'published', position: 0,
    }).select('id').single();
    if (mediaError) {
      await admin.storage.from('catalogue').remove([cataloguePath]);
      return adminResultRedirect('/admin/media', 'error');
    }
    productMediaId = mediaRecord.id;
  }

  const { data, error } = await admin.schema('private').from('media_uploads').update({
    status: 'published', catalogue_path: cataloguePath, version: upload.version + 1,
  }).eq('id', upload.id).eq('version', upload.version).select('id').maybeSingle();
  if (error || !data) {
    if (productMediaId) await admin.from('product_media').delete().eq('id', productMediaId);
    await admin.storage.from('catalogue').remove([cataloguePath]);
    return adminResultRedirect('/admin/media', data ? 'error' : 'conflict');
  }
  await writeAudit(request.authorization.user.id, request.authorization.role, 'media.published', 'media_upload', upload.id, {
    assigned_to_product: Boolean(upload.product_id),
  });
  return adminResultRedirect('/admin/media');
};
