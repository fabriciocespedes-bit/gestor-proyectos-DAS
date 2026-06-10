'use client';

import { createBrowserClient } from '@supabase/ssr';

/** Cliente Supabase para componentes de cliente (anon key + sesión en cookies). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
}

// Singleton para reutilizar en hooks.
let _client: ReturnType<typeof createClient> | null = null;
export function supabase() {
  if (!_client) _client = createClient();
  return _client;
}
