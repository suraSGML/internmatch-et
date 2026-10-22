import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates a Supabase browser client for use in Client Components.
 * Reads credentials from public environment variables.
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
