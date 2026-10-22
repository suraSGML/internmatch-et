import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Award, BookOpen, Calendar, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CompanyInternsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: membership, error: membershipError } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) {
    return (
      <DashboardLayout locale={locale}>
        <Card className="border border-red-200 bg-red-50 shadow-sm">
          <CardContent className="py-4 text-sm text-red-700">
            Could not load your company membership: {membershipError.message}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }
  if (!membership) redirect(`/${locale}/onboarding`);

  // Scope elevated reads to the company membership verified above; application
  // joins otherwise trigger the legacy recursive applications RLS policies.
  const service = createServiceClient();
  const { data: placements, error: placementsError } = await service
    .from('placements')
    .select(`
      id, student_id, start_date, end_date, status,
      profiles!placements_student_id_fkey(full_name, phone, city),
      applications(internships(title))
    `)
    .eq('company_id', membership.company_id)
    .in('status', ['pending_approval', 'approved', 'active', 'completed'])
    .order('created_at', { ascending: false });

  const studentIds = [...new Set((placements ?? []).map((placement) => placement.student_id))];
  const { data: studentProfiles, error: studentProfilesError } = studentIds.length
    ? await service
        .from('student_profiles')
        .select('user_id, year_of_study, universities(name), departments(name)')
        .in('user_id', studentIds)
    : { data: [], error: null };
  const studentProfilesByUser = new Map(
    (studentProfiles ?? []).map((studentProfile) => [studentProfile.user_id, studentProfile])
  );

  const placementIds = (placements ?? []).map((placement) => placement.id);
  const { data: certificates, error: certificatesError } = placementIds.length
    ? await service
        .from('certificates')
        .select('placement_id, public_code')
        .in('placement_id', placementIds)
        .is('revoked_at', null)
    : { data: [] };
  const certificatesByPlacement = new Map(
    (certificates ?? []).map((certificate) => [certificate.placement_id, certificate.public_code])
  );

  const active = (placements ?? []).filter((p) => p.status === 'active');
  const awaitingApproval = (placements ?? []).filter((p) => p.status === 'pending_approval');
  const awaitingStart = (placements ?? []).filter((p) => p.status === 'approved');
  const completed = (placements ?? []).filter((p) => p.status === 'completed');

  type PlacementRow = NonNullable<typeof placements>[number];

  const renderCard = (p: PlacementRow) => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles as Record<string, unknown> | null;
    const sp = studentProfilesByUser.get(p.student_id) ?? null;
    const app = Array.isArray(p.applications) ? p.applications[0] : p.applications as Record<string, unknown> | null;
    const internship = app ? (Array.isArray((app as Record<string, unknown>).internships) ? ((app as Record<string, unknown>).internships as Array<{ title?: string }>)[0] : (app as Record<string, unknown>).internships as { title?: string } | null) : null;
    const uni = sp ? (Array.isArray((sp as Record<string, unknown>).universities) ? ((sp as Record<string, unknown>).universities as Array<{ name?: string }>)[0] : (sp as Record<string, unknown>).universities as { name?: string } | null) : null;

    return (
      <Card key={p.id} className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                <User className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900">
                  {(profile as { full_name?: string } | null)?.full_name ?? 'Student'}
                </p>
                <p className="text-sm text-gray-500">
                  {(internship as { title?: string } | null)?.title ?? 'Internship'}
                </p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                  {(uni as { name?: string } | null)?.name && (
                    <span>{(uni as { name: string }).name}</span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(p.start_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                    {p.end_date && ` – ${new Date(p.end_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}`}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={p.status} />
              {certificatesByPlacement.has(p.id) && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                  <Award className="h-3.5 w-3.5" /> Certificate issued
                </span>
              )}
              {p.status === 'completed' && !certificatesByPlacement.has(p.id) && (
                <span className="text-xs text-gray-500">Final evaluation and certificate available in details</span>
              )}
              <Link
                href={`/${locale}/company/interns/${p.id}`}
                className="text-xs text-indigo-600 hover:underline"
              >
                Track intern →
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interns</h1>
          <p className="text-sm text-gray-500 mt-1">Track each placement from approval through completion.</p>
        </div>

        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-green-700">{active.length}</p>
              <p className="mt-1 text-sm font-medium text-gray-600">Active</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-blue-700">{awaitingStart.length}</p>
              <p className="mt-1 text-sm font-medium text-gray-600">Approved · Awaiting start</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-amber-700">{awaitingApproval.length}</p>
              <p className="mt-1 text-sm font-medium text-gray-600">Awaiting approval</p>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4">
              <p className="text-2xl font-bold text-gray-700">{completed.length}</p>
              <p className="mt-1 text-sm font-medium text-gray-600">Completed</p>
            </CardContent>
          </Card>
        </div>

        {placementsError && (
          <Card className="border border-red-200 bg-red-50 shadow-sm">
            <CardContent className="py-4 text-sm text-red-700">
              Could not load placements: {placementsError.message}
            </CardContent>
          </Card>
        )}

        {studentProfilesError && (
          <Card className="border border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="py-4 text-sm text-amber-800">
              Placement records loaded, but student university and department details could not be loaded: {studentProfilesError.message}
            </CardContent>
          </Card>
        )}

        {certificatesError && (
          <Card className="border border-amber-200 bg-amber-50 shadow-sm">
            <CardContent className="py-4 text-sm text-amber-800">
              Placement details loaded, but certificate status could not be checked: {certificatesError.message}
            </CardContent>
          </Card>
        )}

        {active.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3">Active Interns</h2>
            <div className="space-y-3">{active.map(renderCard)}</div>
          </section>
        )}

        {awaitingStart.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3">Approved — Awaiting Start Date</h2>
            <p className="text-sm text-gray-500 mb-3">
              These students are approved and will become active when the coordinator marks the placement active after the start date.
            </p>
            <div className="space-y-3">{awaitingStart.map(renderCard)}</div>
          </section>
        )}

        {awaitingApproval.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">Awaiting University Approval</h2>
            <div className="space-y-3">{awaitingApproval.map(renderCard)}</div>
          </section>
        )}

        {completed.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Completed</h2>
            <div className="space-y-3">{completed.map(renderCard)}</div>
          </section>
        )}

        {!placementsError && !placements?.length && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-gray-400">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No placements to track yet.</p>
              <p className="mt-2 text-sm">
                A student appears here after accepting your offer. The accepted placement will show as awaiting approval or awaiting its start date.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
