import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { OnboardingFlow } from './OnboardingFlow';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // Use maybeSingle so we don't throw if profile row doesn't exist yet
  let { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .maybeSingle();

  // If profile row missing (rare race condition), create it via service role
  if (!profile) {
    const service = createServiceClient();
    const role = (user.user_metadata?.role as string) ?? 'student';
    const fullName = (user.user_metadata?.full_name as string) ?? user.email ?? 'User';
    await service
      .from('profiles')
      .upsert({ id: user.id, role, full_name: fullName }, { onConflict: 'id' });
    profile = { role, full_name: fullName } as { role: string; full_name: string };
  }

  // If already fully onboarded, redirect to dashboard
  const service = createServiceClient();

  if (profile?.role === 'student') {
    const { data: sp } = await service
      .from('student_profiles')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (sp) redirect(`/${locale}/student/dashboard`);
  }

  if (profile?.role === 'company') {
    const { data: cm } = await service
      .from('company_members')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (cm) redirect(`/${locale}/company/dashboard`);
  }

  if (profile?.role === 'university') {
    // University coordinators are linked by admin — always go to dashboard
    redirect(`/${locale}/university/dashboard`);
  }

  if (profile?.role === 'admin') {
    redirect(`/${locale}/admin`);
  }

  const { data: universities } = await supabase
    .from('universities')
    .select('id, name')
    .eq('status', 'verified')
    .order('name');

  return (
    <OnboardingFlow
      role={profile?.role ?? 'student'}
      fullName={profile?.full_name ?? ''}
      userId={user.id}
      universities={universities ?? []}
      locale={locale}
    />
  );
}
