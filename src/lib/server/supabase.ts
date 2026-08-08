import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';
import type { APIContext } from 'astro';

import {
  requireSupabaseAdminEnvironment,
  requireSupabaseEnvironment,
} from './runtime-env';

function readRequestCookies(request: Request) {
  const header = request.headers.get('cookie');
  if (!header) return [];

  return header.split(';').flatMap((part) => {
    const separator = part.indexOf('=');
    if (separator < 1) return [];

    const name = part.slice(0, separator).trim();
    const encodedValue = part.slice(separator + 1).trim();

    try {
      return [{ name, value: decodeURIComponent(encodedValue) }];
    } catch {
      return [{ name, value: encodedValue }];
    }
  });
}

export function createRequestSupabase(context: Pick<APIContext, 'cookies' | 'request'>) {
  const environment = requireSupabaseEnvironment();

  return createServerClient(environment.url, environment.publishableKey, {
    auth: {
      flowType: 'pkce',
    },
    cookies: {
      getAll() {
        return readRequestCookies(context.request);
      },
      setAll(cookies) {
        for (const { name, value, options } of cookies) {
          context.cookies.set(name, value, {
            ...options,
            httpOnly: true,
            path: '/',
            sameSite: 'lax',
            secure: import.meta.env.PROD,
          } as Parameters<typeof context.cookies.set>[2]);
        }
      },
    },
  });
}

export function createSupabaseAdmin() {
  const environment = requireSupabaseAdminEnvironment();

  return createClient(environment.url, environment.secretKey, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

export async function getStaffRole(userId: string) {
  const admin = createSupabaseAdmin();
  const { data, error } = await admin
    .schema('private')
    .from('staff_members')
    .select('role')
    .eq('user_id', userId)
    .eq('active', true)
    .maybeSingle();

  if (error) {
    throw new Error('Unable to verify staff access.');
  }

  return (data?.role as App.Locals['staffRole']) ?? null;
}
