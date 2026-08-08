import { createSupabaseAdmin } from './supabase';

function toHex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

export async function consumeEmailCodeLimit(email: string, request: Request) {
  const connectingIp = request.headers.get('cf-connecting-ip') ?? 'local';
  const material = new TextEncoder().encode(`${email}|${connectingIp}`);
  const keyHash = toHex(await crypto.subtle.digest('SHA-256', material));
  const admin = createSupabaseAdmin();
  const { data, error } = await admin.schema('private').rpc('consume_auth_rate_limit', {
    p_key_hash: keyHash,
    p_limit: 5,
    p_window_seconds: 600,
  });

  if (error) throw new Error('Unable to validate the request.');
  return data === true;
}
