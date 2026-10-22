'use client';

import { useState, use, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Briefcase, GraduationCap, Building2, University,
  Loader2, Clock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { signUpAction } from '@/lib/actions/auth';

const registerSchema = z
  .object({
    fullName: z.string().min(2, 'Full name must be at least 2 characters'),
    email: z.string().email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[a-zA-Z]/, 'Password must contain at least one letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string(),
    role: z.enum(['student', 'company', 'university'] as const, {
      errorMap: () => ({ message: 'Please select a role' }),
    }),
    agreeToTerms: z.boolean().refine((v) => v === true, 'You must agree to the terms'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;
type RegisterRole = 'student' | 'company' | 'university';

const ROLE_OPTIONS: Array<{
  value: RegisterRole;
  labelKey: string;
  descKey: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { value: 'student',    labelKey: 'roleStudent',    descKey: 'roleStudentDesc',    icon: GraduationCap },
  { value: 'company',    labelKey: 'roleCompany',    descKey: 'roleCompanyDesc',    icon: Building2 },
  { value: 'university', labelKey: 'roleUniversity', descKey: 'roleUniversityDesc', icon: University },
];

// Client-side rate limit: max 3 attempts per session before a cooldown
const CLIENT_MAX_ATTEMPTS = 3;
const CLIENT_COOLDOWN_SEC = 60;

export default function RegisterPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = use(params);
  const t = useTranslations('auth');
  const router = useRouter();

  const [error, setError] = useState<string | null>(null);

  // Client-side rate limit state
  const [attempts, setAttempts] = useState(0);
  const [cooldownSec, setCooldownSec] = useState(0);

  // Tick down the cooldown every second
  useEffect(() => {
    if (cooldownSec <= 0) return;
    const id = setInterval(() => {
      setCooldownSec((s) => {
        if (s <= 1) { clearInterval(id); return 0; }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [cooldownSec]);

  const isRateLimited = cooldownSec > 0;

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'student', agreeToTerms: false },
  });

  const selectedRole = watch('role');

  const onSubmit = useCallback(async (data: RegisterFormData) => {
    if (isRateLimited) return;
    setError(null);

    // Increment client-side attempt counter
    const newAttempts = attempts + 1;
    setAttempts(newAttempts);

    // Enforce client-side cooldown after threshold
    if (newAttempts >= CLIENT_MAX_ATTEMPTS) {
      setCooldownSec(CLIENT_COOLDOWN_SEC);
    }

    try {
      const result = await signUpAction(data.email, data.password, data.fullName, data.role);

      if (result?.error) {
        if (result.rateLimited && result.retryAfterSec) {
          setCooldownSec(result.retryAfterSec);
        }
        setError(result.error);
        return;
      }

      // If auto-login failed (rare), send to login page
      if (result.requiresLogin) {
        router.push(`/${locale}/login`);
        return;
      }

      // Success — user is logged in, go straight to onboarding
      router.push(`/${locale}/onboarding`);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    }
  }, [attempts, isRateLimited]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-white flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-lg">
        {/* Logo */}
        <div className="flex items-center justify-center gap-2 mb-8 text-indigo-700 font-bold text-xl">
          <Briefcase className="h-7 w-7" />
          InternMatch ET
        </div>

        <Card className="shadow-lg border-0">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl">{t('registerTitle')}</CardTitle>
            <CardDescription>{t('registerSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>

              {/* Error alert */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {/* Rate-limit cooldown banner */}
              {isRateLimited && (
                <Alert className="border-amber-300 bg-amber-50 text-amber-800">
                  <Clock className="h-4 w-4 mr-2 inline" />
                  <AlertDescription>
                    Too many attempts. Please wait <strong>{cooldownSec}s</strong> before trying again.
                  </AlertDescription>
                </Alert>
              )}

              {/* Role selector */}
              <div className="space-y-2">
                <Label>{t('selectRole')}</Label>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {ROLE_OPTIONS.map(({ value, labelKey, descKey, icon: Icon }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setValue('role', value, { shouldValidate: true })}
                      className={cn(
                        'flex flex-col items-center text-center p-3 rounded-lg border-2 transition-all',
                        selectedRole === value
                          ? 'border-indigo-600 bg-indigo-50'
                          : 'border-gray-200 hover:border-gray-300'
                      )}
                    >
                      <Icon className={cn('h-6 w-6 mb-1', selectedRole === value ? 'text-indigo-600' : 'text-gray-400')} />
                      <span className={cn('text-xs font-medium', selectedRole === value ? 'text-indigo-700' : 'text-gray-700')}>
                        {t(labelKey as Parameters<typeof t>[0])}
                      </span>
                      <span className="text-xs text-gray-400 mt-0.5 hidden sm:block">
                        {t(descKey as Parameters<typeof t>[0])}
                      </span>
                    </button>
                  ))}
                </div>
                {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
              </div>

              {/* Full name */}
              <div className="space-y-1.5">
                <Label htmlFor="fullName">{t('fullName')}</Label>
                <Input
                  id="fullName"
                  type="text"
                  autoComplete="name"
                  placeholder="Abebe Kebede"
                  {...register('fullName')}
                  aria-invalid={!!errors.fullName}
                />
                {errors.fullName && <p className="text-xs text-red-500">{errors.fullName.message}</p>}
              </div>

              {/* Email */}
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
                {errors.email && <p className="text-xs text-red-500">{errors.email.message}</p>}
              </div>

              {/* Password */}
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
                {errors.password && <p className="text-xs text-red-500">{errors.password.message}</p>}
              </div>

              {/* Confirm password */}
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
                {errors.confirmPassword && <p className="text-xs text-red-500">{errors.confirmPassword.message}</p>}
              </div>

              {/* Terms */}
              <div className="flex items-start gap-2">
                <input
                  id="agreeToTerms"
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  {...register('agreeToTerms')}
                />
                <Label htmlFor="agreeToTerms" className="text-sm text-gray-600 font-normal cursor-pointer">
                  {t('agreeToTerms')}
                </Label>
              </div>
              {errors.agreeToTerms && <p className="text-xs text-red-500">{errors.agreeToTerms.message}</p>}

              <Button
                type="submit"
                className="w-full bg-indigo-600 hover:bg-indigo-700"
                disabled={isSubmitting || isRateLimited}
              >
                {isRateLimited ? (
                  <>
                    <Clock className="mr-2 h-4 w-4" />
                    Wait {cooldownSec}s
                  </>
                ) : isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  t('signUp')
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              {t('hasAccount')}{' '}
              <Link href={`/${locale}/login`} className="text-indigo-600 font-medium hover:underline">
                {t('signIn')}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
