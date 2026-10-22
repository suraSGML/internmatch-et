import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { VerifyCompanyActions } from './VerifyCompanyActions';
import { Building2, FileText, Globe, MapPin } from 'lucide-react';
import { createVerificationDocumentUrl } from '@/lib/storage/verification-documents';

export const dynamic = 'force-dynamic';

export default async function AdminCompaniesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // Verify admin role
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') redirect(`/${locale}/student/dashboard`);

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, status, review_note, industry, city, website, registration_number, profiles!companies_owner_id_fkey(full_name, phone)')
    .order('created_at', { ascending: false });

  const rows = (companies ?? []) as unknown as CompanyRow[];
  const companyIds = rows.map((company) => company.id);
  const { data: documents, error: documentsError } = companyIds.length
    ? await supabase
        .from('verification_documents')
        .select('id, owner_id, doc_type, file_path, created_at')
        .eq('owner_type', 'company')
        .in('owner_id', companyIds)
        .order('created_at', { ascending: false })
    : { data: [], error: null };

  const documentsByCompany = new Map<string, VerificationDocument[]>();
  for (const document of documents ?? []) {
    const { url, error } = await createVerificationDocumentUrl(document.file_path);
    if (error) {
      console.error(`Could not create verification document link (${document.id}):`, error);
    }

    const companyDocuments = documentsByCompany.get(document.owner_id) ?? [];
    companyDocuments.push({ ...document, file_path: url ?? '' });
    documentsByCompany.set(document.owner_id, companyDocuments);
  }
  if (documentsError) {
    console.error('Could not load company verification documents:', documentsError);
  }

  for (const company of rows) {
    company.verificationDocuments = documentsByCompany.get(company.id) ?? [];
  }

  const pending = rows.filter((c) => c.status === 'pending');
  const verified = rows.filter((c) => c.status === 'verified');
  const suspended = rows.filter((c) => c.status === 'suspended');
  const others = rows.filter((c) => !['pending', 'verified', 'suspended'].includes(c.status));

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Company Verification</h1>
          <p className="text-gray-500 mt-1">
            Review and verify company registrations.
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Pending', count: pending.length, color: 'text-amber-600 bg-amber-50' },
            { label: 'Verified', count: verified.length, color: 'text-green-600 bg-green-50' },
            { label: 'Suspended', count: suspended.length, color: 'text-red-600 bg-red-50' },
            { label: 'Other', count: others.length, color: 'text-gray-600 bg-gray-50' },
          ].map(({ label, count, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${color} rounded-lg py-1`}>{count}</p>
                <p className="text-sm text-gray-500 mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Pending companies — priority */}
        {pending.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide">
              Awaiting Review ({pending.length})
            </h2>
            {pending.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}

        {/* Verified */}
        {verified.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-green-700 uppercase tracking-wide">
              Verified ({verified.length})
            </h2>
            {verified.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}

        {suspended.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-red-700 uppercase tracking-wide">
              Suspended ({suspended.length})
            </h2>
            {suspended.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}

        {others.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Rejected ({others.length})
            </h2>
            {others.map((company) => (
              <CompanyCard key={company.id} company={company} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

interface CompanyRow {
  id: string;
  name: string;
  status: string;
  review_note?: string | null;
  industry?: string | null;
  city?: string | null;
  website?: string | null;
  registration_number?: string | null;
  profiles?: { full_name: string; phone?: string | null } | null;
  verificationDocuments?: VerificationDocument[];
}

interface VerificationDocument {
  id: string;
  owner_id: string;
  doc_type: string;
  file_path: string;
  created_at: string;
}

function CompanyCard({ company }: { company: CompanyRow }) {
  const owner = company.profiles;
  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="font-semibold text-gray-900">{company.name}</p>
                <StatusBadge status={company.status} />
              </div>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                {company.industry && <span>{company.industry}</span>}
                {company.city && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{company.city}
                  </span>
                )}
                {company.website && (
                  <a
                    href={company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-indigo-600 hover:underline"
                  >
                    <Globe className="h-3 w-3" />Website
                  </a>
                )}
              </div>
              {company.status === 'rejected' && company.review_note && (
                <div className="mt-2 rounded-md border border-red-100 bg-red-50 p-2 text-sm text-red-800">
                  <span className="font-medium">Rejection reason: </span>
                  {company.review_note}
                </div>
              )}
              {owner && (
                <p className="text-xs text-gray-400 mt-1">
                  Owner: {owner.full_name}{owner.phone ? ` · ${owner.phone}` : ''}
                </p>
              )}
              {company.registration_number && (
                <p className="text-xs text-gray-400">
                  Reg #: {company.registration_number}
                </p>
              )}
              <div className="mt-3 space-y-1.5">
                <p className="text-xs font-medium text-gray-700">
                  Registration documents ({company.verificationDocuments?.length ?? 0})
                </p>
                {company.verificationDocuments?.length ? (
                  company.verificationDocuments.map((document) => (
                    <div key={document.id} className="flex items-center gap-1.5 text-xs">
                      <FileText className="h-3.5 w-3.5" />
                      {document.file_path ? (
                        <a
                          href={document.file_path}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-600 hover:underline"
                        >
                          {document.doc_type} · {new Date(document.created_at).toLocaleDateString()}
                        </a>
                      ) : (
                        <span className="text-amber-700">
                          {document.doc_type} · File unavailable
                        </span>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-amber-700">No documents submitted</p>
                )}
              </div>
            </div>
          </div>
          <div className="shrink-0">
            <VerifyCompanyActions
              companyId={company.id}
              currentStatus={company.status}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
