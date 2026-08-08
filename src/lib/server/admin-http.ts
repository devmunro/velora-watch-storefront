import type { APIContext } from 'astro';
import type { User } from '@supabase/supabase-js';

import { authorizeAdmin, type StaffRole } from './admin';
import { isSameOriginRequest, readForm, redirect } from './http';
import { createSupabaseAdmin } from './supabase';

type AdminMutationStart =
  | { response: Response }
  | { authorization: { user: User; role: StaffRole }; form: FormData };

export async function beginAdminMutation(context: APIContext, allowed: StaffRole[]): Promise<AdminMutationStart> {
  if (!isSameOriginRequest(context.request)) {
    return { response: new Response('Invalid request.', { status: 403 }) } as const;
  }

  const authorization = await authorizeAdmin(context, allowed);
  if (!authorization) {
    return { response: new Response('Administrative permission required.', { status: 403 }) } as const;
  }

  try {
    const form = await readForm(context.request, 65_536);
    return { authorization, form } as const;
  } catch {
    return { response: new Response('Invalid request.', { status: 400 }) } as const;
  }
}

export async function updateVersionedRecord(
  table: string,
  id: string,
  version: number,
  values: Record<string, unknown>,
) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .from(table)
    .update({ ...values, version: version + 1 })
    .eq('id', id)
    .eq('version', version)
    .select('id')
    .maybeSingle();

  if (error) return { status: 'error' as const, error };
  if (!data) return { status: 'conflict' as const };
  return { status: 'updated' as const };
}

export function adminResultRedirect(
  returnTo: string,
  result: 'saved' | 'conflict' | 'error' | 'not-found' = 'saved',
): Response {
  const separator = returnTo.includes('?') ? '&' : '?';
  if (result === 'saved') return redirect(`${returnTo}${separator}saved=1`);
  return redirect(`${returnTo}${separator}error=${result}`);
}
