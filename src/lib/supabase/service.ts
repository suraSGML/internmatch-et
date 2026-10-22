import { createClient } from '@supabase/supabase-js';

/**
 * Service role client — bypasses RLS entirely.
 * Use ONLY in server actions/route handlers for operations that need
 * elevated privileges (e.g. onboarding upserts, admin actions).
 * NEVER expose this to the browser.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase service role environment variables');
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
