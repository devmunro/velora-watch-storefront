import type { APIRoute } from 'astro';

import { authorizeAdmin, writeAudit } from '../../../../lib/server/admin';
import { mediaSignSchema } from '../../../../lib/server/admin-validation';
import { isSameOriginRequest, readJson } from '../../../../lib/server/http';
import { getRuntimeEnvironment } from '../../../../lib/server/runtime-env';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';

export const POST: APIRoute = async (context) => {
  if (!isSameOriginRequest(context.request)) return Response.json({ error: 'Invalid request.' }, { status: 403 });
  const authorization = await authorizeAdmin(context, ['owner', 'editor']);
  if (!authorization) return Response.json({ error: 'Administrative permission required.' }, { status: 403 });

  try {
    const parsed = mediaSignSchema.safeParse(await readJson(context.request, 4096));
    if (!parsed.success) return Response.json({ error: 'Choose a valid JPEG, PNG or WebP image up to 10 MB and provide alternative text.' }, { status: 400 });
    const extension = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }[parsed.data.mimeType];
    const uploadId = crypto.randomUUID();
    const date = new Date().toISOString().slice(0, 10);
    const stagingPath = `${authorization.user.id}/${date}/${uploadId}.${extension}`;
    const admin = createSupabaseAdmin();
    const { error: insertError } = await admin.schema('private').from('media_uploads').insert({
      id: uploadId,
      staff_user_id: authorization.user.id,
      product_id: parsed.data.productId,
      staging_path: stagingPath,
      original_filename: parsed.data.filename,
      mime_type: parsed.data.mimeType,
      size_bytes: parsed.data.size,
      alt_text: parsed.data.altText,
    });
    if (insertError) return Response.json({ error: 'Upload could not be prepared.' }, { status: 503 });

    const { data, error } = await admin.storage.from('cms-staging').createSignedUploadUrl(stagingPath, { upsert: false });
    if (error) {
      await admin.schema('private').from('media_uploads').update({ status: 'rejected' }).eq('id', uploadId);
      return Response.json({ error: 'Upload could not be prepared.' }, { status: 503 });
    }
    const environment = getRuntimeEnvironment();
    await writeAudit(authorization.user.id, authorization.role, 'media.upload_authorised', 'media_upload', uploadId, {
      mime_type: parsed.data.mimeType,
      size_bytes: parsed.data.size,
    });
    return Response.json({
      uploadId,
      path: data.path,
      token: data.token,
      supabaseUrl: environment.PUBLIC_SUPABASE_URL,
      publishableKey: environment.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    });
  } catch {
    return Response.json({ error: 'Upload could not be prepared.' }, { status: 503 });
  }
};
