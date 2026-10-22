import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Ban } from 'lucide-react';
import { CompanyVerificationProvider } from '@/components/company/CompanyVerificationContext';

export const dynamic = 'force-dynamic';

export default async function CompanyLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const role = profile?.role ?? user.user_metadata?.role;

  if (role !== 'company' && role !== 'admin') {
    redirect(`/${locale}/unauthorized`);
  }

  if (role === 'company') {
    const service = createServiceClient();
    const { data: membership, error: membershipError } = await service
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (membershipError) {
      throw new Error(`Could not check company access: ${membershipError.message}`);
    }

    const { data: company, error: companyError } = membership
      ? await service
          .from('companies')
          .select('name, status, review_note')
          .eq('id', membership.company_id)
          .maybeSingle()
      : { data: null, error: null };
    if (companyError) {
      throw new Error(`Could not check company verification status: ${companyError.message}`);
    }
    if (company?.status === 'suspended') {
      return (
        <DashboardLayout locale={locale}>
          <div className="mx-auto max-w-2xl py-10">
            <Card className="border-red-200 bg-red-50 shadow-sm">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="rounded-full bg-red-100 p-3">
                  <Ban className="h-6 w-6 text-red-700" />
                </div>
                <div className="space-y-2">
                  <h1 className="text-lg font-semibold text-red-950">Company access suspended</h1>
                  <p className="text-sm leading-6 text-red-900">
                    {company.name} has been suspended by an administrator. Company workspace
                    actions, including posting internships and managing applicants, are unavailable
                    until the company is reactivated.
                  </p>
                  <p className="text-sm leading-6 text-red-900">
                    You can still sign in, but company access will remain blocked. Contact{' '}
                    <a className="font-medium underline" href="mailto:admin@internmatch.et">
                      admin@internmatch.et
                    </a>{' '}
                    if you believe this is a mistake.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      );
    }

    const verificationState =
      company?.status === 'pending' || company?.status === 'rejected'
        ? {
            name: company.name,
            status: company.status,
            reviewNote: company.review_note,
          }
        : null;

    return (
      <CompanyVerificationProvider value={verificationState}>
        {children}
      </CompanyVerificationProvider>
    );
  }

  return <>{children}</>;
}
