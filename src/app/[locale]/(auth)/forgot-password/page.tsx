'use client';

import { useState, use } from 'react';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Briefcase, Loader2, CheckCircle2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useSupabase } from '@/hooks/useSupabase';

const schema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations('auth');
  const supabase = useSupabase();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    setError(null);
    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/${locale}/reset-password`,
      });
      if (authError) {
        setError(authError.message);
        return;
      }
      setSuccess(true);
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
              <h2 className="text-xl font-bold mb-2">{t('checkEmail')}</h2>
              <p className="text-gray-500 text-sm mb-6">{t('resetSentMsg')}</p>
              <Button asChild variant="outline" className="gap-2">
                <Link href={`/${locale}/login`}>
                  <ArrowLeft className="h-4 w-4" />
                  {t('backToLogin')}
                </Link>
              </Button>
            </CardContent>
          ) : (
            <>
              <CardHeader className="text-center pb-4">
                <CardTitle className="text-2xl">{t('forgotTitle')}</CardTitle>
                <CardDescription>{t('forgotSubtitle')}</CardDescription>
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
                  <Button
                    type="submit"
                    className="w-full bg-indigo-600 hover:bg-indigo-700"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      t('sendResetLink')
                    )}
                  </Button>
                </form>
                <div className="text-center mt-4">
                  <Link
                    href={`/${locale}/login`}
                    className="text-sm text-indigo-600 hover:underline inline-flex items-center gap-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
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


