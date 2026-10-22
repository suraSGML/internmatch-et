'use client';

import { createClient } from '@/lib/supabase/client';

/**
 * Returns the Supabase browser client.
 * Use this in Client Components that need direct Supabase access.
 *
 * For most data fetching, prefer Server Components with the server client,
 * or TanStack Query hooks that wrap server actions.
 */
export function useSupabase() {
  return createClient();
}
