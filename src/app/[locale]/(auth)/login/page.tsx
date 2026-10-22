'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabase } from '@/hooks/useSupabase';
import { checkUserOnboardedAction } from '@/lib/actions/auth';
import type { UserRole } from '@/types';
import { use } from 'react';

const DASHBOARD_PATHS: Record<UserRole, string> = {
  student:    '/student/dashboard',
  company:    '/company/dashboard',
  university: '/university/dashboard',
  admin:      '/admin',
};

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations('auth');
  const supabase = useSupabase();
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setError(null);
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (authError) {
        setError(
          /banned|suspended/i.test(authError.message)
            ? 'This account has been suspended. Contact admin@internmatch.et for assistance.'
            : authError.message
        );
        return;
      }

      if (!authData.user) {
        setError('Sign-in succeeded but no user account was returned. Please try again.');
        return;
      }

      const rawRole = authData.user.user_metadata?.role;
      const role: UserRole = typeof rawRole === 'string' && rawRole in DASHBOARD_PATHS
        ? rawRole as UserRole
        : 'student';

      // Onboarding lookup should not turn a successful sign-in into a login error.
      let isOnboarded = true;
      try {
        ({ isOnboarded } = await checkUserOnboardedAction(authData.user.id, role));
      } catch (lookupError) {
        console.error('Could not check onboarding status after sign-in:', lookupError);
      }

      const searchParams = new URLSearchParams(window.location.search);
      const next = searchParams.get('next');
      const safeNext = next?.startsWith('/') && !next.startsWith('//') ? next : null;

      const destination = safeNext
        ?? `/${locale}${isOnboarded ? DASHBOARD_PATHS[role] : '/onboarding'}`;
      window.location.assign(destination);
    } catch (loginError) {
      console.error('Sign-in failed:', loginError);
      setError('Could not complete sign-in. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8 text-indigo-700 font-bold text-xl">
          <Briefcase className="h-7 w-7" />
          InternMatch ET
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">{t('loginTitle')}</CardTitle>
            <CardDescription>{t('loginSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="email">{t('email')}</Label>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...register('email')}
                  aria-invalid={!!errors.email}
                />
                {errors.email && (
                  <p className="text-xs text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('password')}</Label>
                  <Link
                    href={`/${locale}/forgot-password`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    {t('forgotPassword')}
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••••••"
                  {...register('password')}
                  aria-invalid={!!errors.password}
                />
                {errors.password && (
                  <p className="text-xs text-red-500">{errors.password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  t('signIn')
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              {t('noAccount')}{' '}
              <Link href={`/${locale}/register`} className="text-indigo-600 font-medium hover:underline">
                {t('signUp')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
