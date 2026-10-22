import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InternshipForm } from '../InternshipForm';

export const dynamic = 'force-dynamic';

export default async function NewInternshipPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // Verify company is verified before allowing post
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id, companies(status, industry)')
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect(`/${locale}/onboarding`);

  const companiesRaw = membership?.companies;
  const companyStatus = Array.isArray(companiesRaw)
    ? (companiesRaw[0] as { status?: string } | undefined)?.status
    : companiesRaw
    ? (companiesRaw as unknown as { status?: string })?.status
    : undefined;
  const companyIndustry = Array.isArray(companiesRaw)
    ? (companiesRaw[0] as { industry?: string | null } | undefined)?.industry ?? null
    : companiesRaw
      ? (companiesRaw as unknown as { industry?: string | null }).industry ?? null
      : null;
  // Not verified — send back to dashboard which shows the pending banner
  if (companyStatus !== 'verified') redirect(`/${locale}/company/dashboard`);

  const { data: fields } = await supabase
    .from('fields')
    .select('id, name_en')
    .order('name_en');

  return (
    <DashboardLayout locale={locale}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Post New Internship</h1>
          <p className="text-gray-500 mt-1">Fill in the details to attract the right candidates.</p>
        </div>
        <InternshipForm
          fields={fields ?? []}
          industry={companyIndustry}
          locale={locale}
          mode="create"
        />
      </div>
    </DashboardLayout>
  );
}
