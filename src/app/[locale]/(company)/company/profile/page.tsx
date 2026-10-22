import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CompanyProfileForm } from './CompanyProfileForm';
import { CompanyVerificationDocs, type VerificationDoc } from './CompanyVerificationDocs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Card, CardContent } from '@/components/ui/card';
import { ShieldCheck } from 'lucide-react';
import { createVerificationDocumentUrl } from '@/lib/storage/verification-documents';

export const dynamic = 'force-dynamic';

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // Find the company this user owns or belongs to
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id, member_role')
    .eq('user_id', user.id)
    .single();

  let company = null;
  if (membership?.company_id) {
    const { data } = await supabase
      .from('companies')
      .select('*')
      .eq('id', membership.company_id)
      .single();
    company = data;
  }

  let verificationDocs: VerificationDoc[] = [];
  if (company) {
    const { data: documents } = await supabase
      .from('verification_documents')
      .select('id, doc_type, file_path, created_at, review_note')
      .eq('owner_type', 'company')
      .eq('owner_id', company.id)
      .order('created_at', { ascending: false });

    verificationDocs = await Promise.all((documents ?? []).map(async (document) => {
      const { url, error } = await createVerificationDocumentUrl(document.file_path);
      if (error) {
        console.error(`Could not create verification document link (${document.id}):`, error);
      }

      return {
        ...document,
        file_path: url ?? '',
        file_available: Boolean(url),
      };
    }));
  }

  return (
    <DashboardLayout locale={locale}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Company Profile</h1>
            <p className="text-gray-500 mt-1">
              Manage your company information visible to students.
            </p>
          </div>
          {company && <StatusBadge status={company.status} />}
        </div>

        {company?.status === 'verified' && (
          <Card className="border-green-200 bg-green-50 border-0 shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-green-600 shrink-0" />
                <p className="text-sm font-medium text-green-800">
                  Verified company — you can post internships.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        <CompanyProfileForm
          company={company}
          memberRole={membership?.member_role ?? 'recruiter'}
          userId={user.id}
        />
        {company && (
          <CompanyVerificationDocs
            companyId={company.id}
            status={company.status}
            initialDocs={verificationDocs}
            isOwner={membership?.member_role === 'owner'}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
