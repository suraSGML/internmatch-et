'use server';

import { headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { rateLimit } from '@/lib/rateLimit';

/**
 * Rate-limited sign-up server action.
 *
 * - Rate limit: 5 attempts per IP per 10 minutes
 * - Signs the user up AND signs them in immediately so the session cookie
 *   is set before the client redirects to /onboarding
 * - Eagerly creates the profiles row via service role to avoid race conditions
 */
export async function signUpAction(
  email: string,
  password: string,
  fullName: string,
  role: 'student' | 'company' | 'university'
) {
  // ── Rate limit by IP ────────────────────────────────────────────────────────
  const headersList = await headers();
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    'unknown';

  const limit = rateLimit('register', ip, { limit: 5, windowMs: 10 * 60 * 1000 });
  if (!limit.ok) {
    return {
      error: `Too many sign-up attempts. Please wait ${limit.retryAfterSec} seconds.`,
      rateLimited: true,
      retryAfterSec: limit.retryAfterSec,
    };
  }

  // ── Supabase sign-up ────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data, error: authError } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName, role } },
  });

  if (authError) return { error: authError.message, rateLimited: false };
  if (!data.user) return { error: 'Sign-up failed — no user returned.', rateLimited: false };

  // ── Eagerly create profiles row via service role ────────────────────────────
  // Prevents race condition where client hits /onboarding before
  // the handle_new_user trigger fires on the hosted Supabase instance.
  const service = createServiceClient();
  await service
    .from('profiles')
    .upsert(
      { id: data.user.id, role, full_name: fullName },
      { onConflict: 'id' }
    );

  // ── Sign the user in so session cookie is set immediately ──────────────────
  // Without this, the browser has no session and the middleware redirects
  // the /onboarding request back to /login.
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    // Sign-up succeeded but auto-login failed — tell user to log in manually
    return { success: true, requiresLogin: true };
  }

  return { success: true, requiresLogin: false };
}

/**
 * Check if user is fully onboarded using service client to prevent RLS issues.
 */
export async function checkUserOnboardedAction(userId: string, role: string) {
  if (!userId) return { isOnboarded: false };
  const service = createServiceClient();

  if (role === 'student') {
    const { data: sp } = await service
      .from('student_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    return { isOnboarded: !!sp };
  }

  if (role === 'company') {
    const { data: cm } = await service
      .from('company_members')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    return { isOnboarded: !!cm };
  }

  if (role === 'university' || role === 'admin') {
    return { isOnboarded: true };
  }

  return { isOnboarded: false };
}
