import { env as workerEnv } from 'cloudflare:workers';

export interface RuntimeEnvironment {
  PUBLIC_SITE_URL?: string;
  PUBLIC_SUPABASE_PUBLISHABLE_KEY?: string;
  PUBLIC_SUPABASE_URL?: string;
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  SUPABASE_SECRET_KEY?: string;
}

export class ConfigurationError extends Error {
  constructor(message = 'The service is not configured.') {
    super(message);
    this.name = 'ConfigurationError';
  }
}

export function getRuntimeEnvironment(): RuntimeEnvironment {
  const runtime = workerEnv as unknown as RuntimeEnvironment;

  return {
    PUBLIC_SITE_URL: runtime.PUBLIC_SITE_URL ?? import.meta.env.PUBLIC_SITE_URL,
    PUBLIC_SUPABASE_PUBLISHABLE_KEY:
      runtime.PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? import.meta.env.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    PUBLIC_SUPABASE_URL: runtime.PUBLIC_SUPABASE_URL ?? import.meta.env.PUBLIC_SUPABASE_URL,
    STRIPE_SECRET_KEY: runtime.STRIPE_SECRET_KEY ?? import.meta.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: runtime.STRIPE_WEBHOOK_SECRET ?? import.meta.env.STRIPE_WEBHOOK_SECRET,
    SUPABASE_SECRET_KEY: runtime.SUPABASE_SECRET_KEY ?? import.meta.env.SUPABASE_SECRET_KEY,
  };
}

export function hasSupabaseConfiguration(environment = getRuntimeEnvironment()): boolean {
  return Boolean(environment.PUBLIC_SUPABASE_URL && environment.PUBLIC_SUPABASE_PUBLISHABLE_KEY);
}

export function requireSupabaseEnvironment(environment = getRuntimeEnvironment()) {
  if (!environment.PUBLIC_SUPABASE_URL || !environment.PUBLIC_SUPABASE_PUBLISHABLE_KEY) {
    throw new ConfigurationError('Customer accounts are not configured.');
  }

  return {
    publishableKey: environment.PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    url: environment.PUBLIC_SUPABASE_URL,
  };
}

export function requireSupabaseAdminEnvironment(environment = getRuntimeEnvironment()) {
  const publicEnvironment = requireSupabaseEnvironment(environment);

  if (!environment.SUPABASE_SECRET_KEY) {
    throw new ConfigurationError('Administrative services are not configured.');
  }

  return {
    ...publicEnvironment,
    secretKey: environment.SUPABASE_SECRET_KEY,
  };
}
