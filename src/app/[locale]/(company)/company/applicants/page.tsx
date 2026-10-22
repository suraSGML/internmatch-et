import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ApplicationStatusActions } from '../internships/[id]/applicants/ApplicationStatusActions';
import { Users, Filter } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface SearchParams {
  status?: string;
  q?: string;
  internship?: string;
}

export default async function CompanyApplicantsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: membership, error: membershipError } = await service
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) throw new Error(`Could not load company membership: ${membershipError.message}`);
  if (!membership) redirect(`/${locale}/onboarding`);

  // Get all internship IDs for this company
  const { data: internshipRows, error: internshipsError } = await service
    .from('internships')
    .select('id, title')
    .eq('company_id', membership.company_id)
    .order('created_at', { ascending: false });
  if (internshipsError) throw new Error(`Could not load company internships: ${internshipsError.message}`);

  const internshipIds = (internshipRows ?? []).map((i) => i.id);

  // Build applications query
  let query = service
    .from('applications')
    .select(`
      id, student_id, status, cover_note, match_score, created_at,
      profiles!applications_student_id_fkey(id, full_name, phone, city),
      internships(id, title)
    `)
    .in('internship_id', internshipIds.length ? internshipIds : ['00000000-0000-0000-0000-000000000000'])
    .order('created_at', { ascending: false });

  if (filters.status) query = query.eq('status', filters.status);
  if (filters.internship) query = query.eq('internship_id', filters.internship);

  const { data: applications, error: applicationsError } = await query;
  if (applicationsError) throw new Error(`Could not load applicants: ${applicationsError.message}`);

  const applicantIds = [...new Set((applications ?? []).map((application) => application.student_id))];
  const studentProfilesByUser = new Map<string, Record<string, unknown>>();
  if (applicantIds.length > 0) {
    const { data: studentProfiles, error: studentProfilesError } = await service
      .from('student_profiles')
      .select('user_id, year_of_study, universities(name), departments(name)')
      .in('user_id', applicantIds);
    if (studentProfilesError) {
      throw new Error(`Could not load applicant student profiles: ${studentProfilesError.message}`);
    }
    for (const studentProfile of studentProfiles ?? []) {
      studentProfilesByUser.set(studentProfile.user_id, studentProfile as Record<string, unknown>);
    }
  }
  const applicationsWithStudents = (applications ?? []).map((application) => ({
    ...application,
    student_profiles: studentProfilesByUser.has(application.student_id)
      ? [studentProfilesByUser.get(application.student_id)]
      : [],
  }));

  // Status counts
  const all = applicationsWithStudents;
  const counts: Record<string, number> = {};
  all.forEach((a) => { counts[a.status] = (counts[a.status] ?? 0) + 1; });

  const STATUS_TABS = [
    { key: '', label: 'All', count: all.length },
    { key: 'submitted', label: 'New', count: counts['submitted'] ?? 0 },
    { key: 'under_review', label: 'Under Review', count: counts['under_review'] ?? 0 },
    { key: 'shortlisted', label: 'Shortlisted', count: counts['shortlisted'] ?? 0 },
    { key: 'interview_scheduled', label: 'Interview', count: counts['interview_scheduled'] ?? 0 },
    { key: 'offered', label: 'Offered', count: counts['offered'] ?? 0 },
    { key: 'accepted', label: 'Accepted', count: counts['accepted'] ?? 0 },
    { key: 'rejected', label: 'Rejected', count: counts['rejected'] ?? 0 },
  ];

  type AppRow = (typeof applicationsWithStudents)[number];

  function getProfile(app: AppRow) {
    const p = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles as Record<string, unknown> | null;
    return p as { id?: string; full_name?: string; phone?: string; city?: string } | null;
  }
  function getStudentProfile(app: AppRow) {
    const sp = Array.isArray(app.student_profiles) ? app.student_profiles[0] : app.student_profiles as Record<string, unknown> | null;
    return sp as { year_of_study?: number; universities?: unknown; departments?: unknown } | null;
  }
  function getInternship(app: AppRow) {
    const i = Array.isArray(app.internships) ? app.internships[0] : app.internships as Record<string, unknown> | null;
    return i as { id?: string; title?: string } | null;
  }
  function getUni(sp: ReturnType<typeof getStudentProfile>) {
    if (!sp) return null;
    const u = Array.isArray(sp.universities) ? (sp.universities as Array<{ name?: string }>)[0] : sp.universities as { name?: string } | null;
    return u;
  }
  function getDept(sp: ReturnType<typeof getStudentProfile>) {
    if (!sp) return null;
    const d = Array.isArray(sp.departments) ? (sp.departments as Array<{ name?: string }>)[0] : sp.departments as { name?: string } | null;
    return d;
  }

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Applicants
          </h1>
          <p className="text-gray-500 mt-1">All applications across your internship listings.</p>
        </div>

        {/* Status tabs */}
        <div className="flex gap-2 flex-wrap">
          {STATUS_TABS.map((tab) => {
            const isActive = (filters.status ?? '') === tab.key;
            const params = new URLSearchParams();
            if (tab.key) params.set('status', tab.key);
            if (filters.internship) params.set('internship', filters.internship);
            return (
              <Link
                key={tab.key}
                href={`?${params.toString()}`}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  isActive
                    ? 'bg-indigo-600 text-white'
                    : 'bg-white text-gray-600 border hover:bg-gray-50'
                }`}
              >
                {tab.label}
                {tab.count > 0 && (
                  <span className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {tab.count}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Internship filter */}
        {(internshipRows ?? []).length > 1 && (
          <form method="get" className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              name="internship"
              className="text-sm border rounded-lg px-3 py-1.5 text-gray-700 bg-white"
              defaultValue={filters.internship ?? ''}
            >
              <option value="">All internships</option>
              {(internshipRows ?? []).map((i) => (
                <option key={i.id} value={i.id}>{i.title}</option>
              ))}
            </select>
            {filters.status && <input type="hidden" name="status" value={filters.status} />}
            <button
              type="submit"
              className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
            >
              Filter
            </button>
          </form>
        )}

        {/* Application cards */}
        <div className="space-y-3">
          {all.length === 0 && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-14 text-center text-gray-400">
                <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No applicants found</p>
                <p className="text-sm mt-1">Applications will appear here once students apply.</p>
              </CardContent>
            </Card>
          )}

          {all.map((app) => {
            const profile = getProfile(app);
            const sp = getStudentProfile(app);
            const internship = getInternship(app);
            const uni = getUni(sp);
            const dept = getDept(sp);

            return (
              <Card key={app.id} className="border-0 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    {/* Student info */}
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm shrink-0">
                        {profile?.full_name?.charAt(0) ?? '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900">{profile?.full_name ?? '—'}</p>
                        <div className="flex flex-wrap gap-2 mt-0.5 text-xs text-gray-500">
                          {uni?.name && <span>{uni.name}</span>}
                          {dept?.name && <span>· {dept.name}</span>}
                          {sp?.year_of_study && <span>· Year {sp.year_of_study}</span>}
                          {profile?.city && <span>· {profile.city}</span>}
                        </div>
                        <p className="text-xs text-gray-400 mt-1 truncate max-w-xs">
                          For: <span className="text-indigo-600">{internship?.title ?? '—'}</span>
                        </p>
                        {app.cover_note && (
                          <p className="text-xs text-gray-500 mt-1 line-clamp-2 max-w-sm">{app.cover_note}</p>
                        )}
                        <p className="text-xs text-gray-300 mt-1">
                          Applied {new Date(app.created_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      </div>
                    </div>

                    {/* Right side */}
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <div className="flex items-center gap-2">
                        {app.match_score != null && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            app.match_score >= 70 ? 'bg-green-100 text-green-700' :
                            app.match_score >= 50 ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-500'
                          }`}>
                            {app.match_score}% match
                          </span>
                        )}
                        <StatusBadge status={app.status} />
                      </div>
                      <ApplicationStatusActions
                        applicationId={app.id}
                        currentStatus={app.status}
                        studentId={profile?.id ?? ''}
                        locale={locale}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
