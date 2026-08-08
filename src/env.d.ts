/// <reference types="astro/client" />
/// <reference types="@cloudflare/workers-types" />

import type { User } from '@supabase/supabase-js';

type StaffRole = 'owner' | 'editor' | 'fulfilment';

declare global {
  namespace App {
    interface Locals {
      staffRole: StaffRole | null;
      supabaseConfigured: boolean;
      user: User | null;
    }
  }
}

export {};
