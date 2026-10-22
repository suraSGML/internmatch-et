import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Badge } from '@/components/ui/badge';
import { VerifyUniversityActions } from './VerifyUniversityActions';
import { UnlinkCoordinatorButton } from './UnlinkCoordinatorButton';
import { UniversityRegistrationRequestActions } from './UniversityRegistrationRequestActions';
import { GraduationCap, Users, AlertCircle } from 'lucide-react';
import { createVerificationDocumentUrl } from '@/lib/storage/verification-documents';

export const dynamic = 'force-dynamic';

export default async function AdminUniversitiesPage({
  params,
}: {
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
  if (profile?.role !== 'admin') redirect(`/${locale}/unauthorized`);

  // Fetch universities with their coordinators
  const { data: universities } = await supabase
    .from('universities')
    .select(`
      id, name, status, created_at,
      university_members(
        id, member_role,
        profiles!university_members_user_id_fkey(id, full_name, phone)
      )
    `)
    .order('name');

  const { data: registrationRequests } = await supabase
    .from('university_registration_requests')
    .select('id, user_id, university_id, requested_university_name, created_at, profiles!university_registration_requests_user_id_fkey(full_name, phone)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true });

  const requestIds = (registrationRequests ?? []).map((request) => request.id);
  const { data: requestDocuments, error: requestDocumentsError } = requestIds.length
    ? await supabase
        .from('university_registration_request_documents')
        .select('id, request_id, file_path, original_name, created_at')
        .in('request_id', requestIds)
        .order('created_at', { ascending: true })
    : { data: [], error: null };
  if (requestDocumentsError) {
    console.error('Could not load university affiliation documents:', requestDocumentsError);
  }

  const documentsByRequest = new Map<string, Array<{ id: string; file_path: string; original_name: string }>>();
  for (const document of requestDocuments ?? []) {
    const { url, error } = await createVerificationDocumentUrl(document.file_path);
    if (error) {
      console.error(`Could not create university document link (${document.id}):`, error);
    }
    const requestDocs = documentsByRequest.get(document.request_id) ?? [];
    requestDocs.push({
      id: document.id,
      file_path: url ?? '',
      original_name: document.original_name,
    });
    documentsByRequest.set(document.request_id, requestDocs);
  }

  const requestUniversityIds = (registrationRequests ?? [])
    .map((request) => request.university_id)
    .filter((id): id is string => Boolean(id));
  const { data: requestedUniversities } = requestUniversityIds.length
    ? await supabase.from('universities').select('id, name').in('id', requestUniversityIds)
    : { data: [] };
  const universityNames = new Map((requestedUniversities ?? []).map((university) => [university.id, university.name]));

  type UniMember = {
    id: string;
    member_role: string;
    profiles: { id: string; full_name: string; phone?: string | null } | { id: string; full_name: string; phone?: string | null }[] | null;
  };

  function getMemberProfile(m: UniMember) {
    const p = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return p as { id: string; full_name: string; phone?: string | null } | null;
  }

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-indigo-600" />
            Universities & Coordinators
          </h1>
          <p className="text-gray-500 mt-1">
            Review coordinator campus requests and manage verified university accounts.
          </p>
        </div>

        {registrationRequests?.length ? (
          <Card className="border-amber-200 bg-amber-50 border shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2 text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                University access requests ({registrationRequests.length})
              </CardTitle>
              <p className="text-xs text-amber-700 mt-1">
                Approving links the coordinator. For a new institution, approval also adds it to the platform.
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {registrationRequests.map((request) => {
                const requester = Array.isArray(request.profiles) ? request.profiles[0] : request.profiles;
                return (
                  <div key={request.id} className="flex items-center justify-between gap-4 flex-wrap bg-white rounded-lg p-4">
                    <div>
                      <p className="font-medium text-gray-900">{requester?.full_name ?? 'Coordinator'}</p>
                      <p className="text-sm text-gray-600">
                        {request.university_id
                          ? universityNames.get(request.university_id) ?? 'Existing university'
                          : request.requested_university_name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {requester?.phone ? `${requester.phone} · ` : ''}
                        Requested {new Date(request.created_at).toLocaleDateString()}
                      </p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs font-medium text-gray-700">Affiliation documents</p>
                        {(documentsByRequest.get(request.id) ?? []).map((document) => (
                          <p key={document.id} className="text-xs">
                            {document.file_path ? (
                              <a
                                href={document.file_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-indigo-600 hover:underline"
                              >
                                View {document.original_name}
                              </a>
                            ) : (
                              <span className="text-amber-700">
                                {document.original_name} — file unavailable
                              </span>
                            )}
                          </p>
                        ))}
                        {(documentsByRequest.get(request.id) ?? []).length === 0 && (
                          <p className="text-xs text-amber-700">No documents submitted</p>
                        )}
                      </div>
                    </div>
                    <UniversityRegistrationRequestActions requestId={request.id} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        ) : (
          <div className="flex items-center gap-2 bg-gray-50 border rounded-lg px-4 py-2.5 text-sm text-gray-500">
            No coordinator campus requests are waiting for review.
          </div>
        )}

        {/* ── Universities list ─────────────────────────────────────────── */}
        <div className="space-y-3">
          {(universities ?? []).map((uni) => {
            const members = (uni.university_members ?? []) as UniMember[];

            return (
              <Card key={uni.id} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* University info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                        <GraduationCap className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-gray-900">{uni.name}</p>
                          <StatusBadge status={uni.status} />
                        </div>

                        {/* Coordinators */}
                        {members.length > 0 ? (
                          <div className="mt-2 space-y-1.5">
                            <p className="text-xs font-medium text-gray-500 flex items-center gap-1">
                              <Users className="h-3 w-3" /> Coordinators
                            </p>
                            {members.map((m) => {
                              const mp = getMemberProfile(m);
                              if (!mp) return null;
                              return (
                                <div key={m.id} className="flex items-center gap-2 flex-wrap">
                                  <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700">
                                    {mp.full_name?.charAt(0) ?? '?'}
                                  </div>
                                  <span className="text-sm text-gray-700">{mp.full_name}</span>
                                  <Badge className="text-xs capitalize bg-gray-100 text-gray-500">
                                    {m.member_role}
                                  </Badge>
                                  <UnlinkCoordinatorButton
                                    memberId={m.id}
                                    coordinatorName={mp.full_name}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <p className="text-xs text-gray-400 mt-1">No coordinators assigned</p>
                        )}
                      </div>
                    </div>

                    {/* Verify/reject actions */}
                    <VerifyUniversityActions
                      universityId={uni.id}
                      currentStatus={uni.status}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {!universities?.length && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center text-gray-400 text-sm">
                No universities found.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
