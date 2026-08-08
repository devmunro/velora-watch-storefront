import type { APIRoute } from 'astro';
import { z } from 'zod';

import { authorizeAdmin, writeAudit } from '../../../../lib/server/admin';
import { isSameOriginRequest, readJson } from '../../../../lib/server/http';
import { createSupabaseAdmin } from '../../../../lib/server/supabase';

export const POST: APIRoute = async (context) => {
  if (!isSameOriginRequest(context.request)) return Response.json({ error: 'Invalid request.' }, { status: 403 });
  const authorization = await authorizeAdmin(context, ['owner', 'editor']);
  if (!authorization) return Response.json({ error: 'Administrative permission required.' }, { status: 403 });
  try {
    const parsed = z.object({ uploadId: z.uuid() }).safeParse(await readJson(context.request, 1024));
    if (!parsed.success) return Response.json({ error: 'Invalid upload.' }, { status: 400 });
    const admin = createSupabaseAdmin();
    const { data: upload, error: readError } = await admin.schema('private').from('media_uploads')
      .select('*').eq('id', parsed.data.uploadId).eq('staff_user_id', authorization.user.id).eq('status', 'pending_upload').maybeSingle();
    if (readError || !upload) return Response.json({ error: 'Upload was not found.' }, { status: 404 });
    const lastSlash = upload.staging_path.lastIndexOf('/');
    const directory = upload.staging_path.slice(0, lastSlash);
    const filename = upload.staging_path.slice(lastSlash + 1);
    const { data: objects, error: listError } = await admin.storage.from('cms-staging').list(directory, { search: filename, limit: 10 });
    const object = objects?.find((entry) => entry.name === filename);
    if (listError || !object) return Response.json({ error: 'Uploaded object could not be verified.' }, { status: 409 });
    const { data, error } = await admin.schema('private').from('media_uploads').update({
      status: 'staged', version: upload.version + 1,
    }).eq('id', upload.id).eq('version', upload.version).select('id').maybeSingle();
    if (error || !data) return Response.json({ error: 'Upload state changed. Reload and try again.' }, { status: 409 });
    await writeAudit(authorization.user.id, authorization.role, 'media.staged', 'media_upload', upload.id);
    return Response.json({ ok: true });
  } catch {
    return Response.json({ error: 'Upload verification failed.' }, { status: 503 });
  }
};
