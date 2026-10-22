'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase, Loader2, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabase } from '@/hooks/useSupabase';

const schema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Must contain at least one letter')
      .regex(/[0-9]/, 'Must contain at least one number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type FormData = z.infer<typeof schema>;

export default function ResetPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations('auth');
  const router = useRouter();
  const supabase = useSupabase();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      setSuccess(true);
      setTimeout(() => router.push(`/${locale}/login`), 2000);
    } catch {
      setError('An unexpected error occurred. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8 text-indigo-700 font-bold text-xl">
          <Briefcase className="h-7 w-7" />
          InternMatch ET
        </div>

        <Card className="shadow-lg border-0">
          {success ? (
            <CardContent className="pt-10 pb-8 text-center">
              <CheckCircle2 className="h-14 w-14 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold mb-2">Password updated!</h2>
              <p className="text-gray-500 text-sm mb-4">Redirecting you to login...</p>
            </CardContent>
          ) : (
            <>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{t('resetTitle')}</CardTitle>
                <CardDescription>{t('resetSubtitle')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
                  {error && (
                    <Alert variant="destructive">
                      <AlertDescription>{error}</AlertDescription>
                    </Alert>
                  )}
                  <div className="space-y-1.5">
                    <Label htmlFor="password">{t('password')}</Label>
                    <Input
                      id="password"
                      type="password"
                      autoComplete="new-password"
                      placeholder="At least 8 characters"
                      {...register('password')}
                      aria-invalid={!!errors.password}
                    />
                    {errors.password && (
                      <p className="text-xs text-red-500">{errors.password.message}</p>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="confirmPassword">{t('confirmPassword')}</Label>
                    <Input
                      id="confirmPassword"
                      type="password"
                      autoComplete="new-password"
                      placeholder="Repeat your password"
                      {...register('confirmPassword')}
                      aria-invalid={!!errors.confirmPassword}
                    />
                    {errors.confirmPassword && (
                      <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>
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
                        Updating...
                      </>
                    ) : (
                      t('resetPassword')
                    )}
                  </Button>
                </form>
                <div className="text-center mt-4">
                  <Link href={`/${locale}/login`} className="text-sm text-indigo-600 hover:underline">
                    {t('backToLogin')}
                  </Link>
                </div>
              </CardContent>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}


