import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CompanyApplicationChart } from './CompanyApplicationChart';
import {
  Briefcase, Users, GraduationCap, Plus, Calendar,
  TrendingUp, AlertCircle, ShieldCheck
} from 'lucide-react';

export const dynamic = 'force-dynamic';

interface RecentApplication {
  id: string;
  status: string;
  created_at: string;
  match_score: number | null;
  profiles: { full_name?: string | null } | Array<{ full_name?: string | null }> | null;
  internships: { title?: string | null } | Array<{ title?: string | null }> | null;
}

export default async function CompanyDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: membership, error: membershipError } = await service
    .from('company_members')
    .select('company_id, companies(name, status)')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) throw new Error(`Could not load company membership: ${membershipError.message}`);

  if (!membership) redirect(`/${locale}/onboarding`);

  const companyId = membership.company_id;
  const company = Array.isArray(membership.companies) ? membership.companies[0] : membership.companies as { name?: string; status?: string } | null;
  const isVerified = (company as { status?: string } | null)?.status === 'verified';

  const [
    { count: openCount, error: openError },
    { data: allInternships, error: internshipError },
    { count: activeInterns, error: placementError },
  ] = await Promise.all([
    service.from('internships').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'open'),
    service.from('internships').select('id, title, status, slots, filled_slots, deadline').eq('company_id', companyId).order('created_at', { ascending: false }),
    service.from('placements').select('*', { count: 'exact', head: true }).eq('company_id', companyId).eq('status', 'active'),
  ]);
  if (openError) throw new Error(`Could not load open internships: ${openError.message}`);
  if (internshipError) throw new Error(`Could not load company internships: ${internshipError.message}`);
  if (placementError) throw new Error(`Could not load active placements: ${placementError.message}`);

  const internshipIds = (allInternships ?? []).map((internship) => internship.id);
  let totalApps = 0;
  let applicationStatuses: Array<{ status: string }> = [];
  let recentApps: RecentApplication[] = [];
  let upcomingInterviews = 0;
  if (internshipIds.length > 0) {
    const [
      { count, error: applicationsCountError },
      { data: statuses, error: applicationStatusesError },
      { data, error: recentApplicationsError },
      { count: interviewCount, error: interviewsError },
    ] = await Promise.all([
      service.from('applications').select('*', { count: 'exact', head: true }).in('internship_id', internshipIds),
      service.from('applications').select('status').in('internship_id', internshipIds),
      service
        .from('applications')
        .select('id, status, created_at, match_score, profiles!applications_student_id_fkey(full_name), internships(title)')
        .in('internship_id', internshipIds)
        .order('created_at', { ascending: false })
        .limit(5),
      service
        .from('interviews')
        .select('id, applications!inner(internship_id)', { count: 'exact', head: true })
        .in('applications.internship_id', internshipIds)
        .eq('status', 'scheduled')
        .gte('scheduled_at', new Date().toISOString()),
    ]);
    if (applicationsCountError) throw new Error(`Could not load application count: ${applicationsCountError.message}`);
    if (applicationStatusesError) throw new Error(`Could not load application status totals: ${applicationStatusesError.message}`);
    if (recentApplicationsError) throw new Error(`Could not load recent applicants: ${recentApplicationsError.message}`);
    if (interviewsError) throw new Error(`Could not load upcoming interviews: ${interviewsError.message}`);
    totalApps = count ?? 0;
    applicationStatuses = statuses ?? [];
    recentApps = (data ?? []) as RecentApplication[];
    upcomingInterviews = interviewCount ?? 0;
  }
  const internships = (allInternships ?? []).slice(0, 4);

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {(company as { name?: string } | null)?.name ?? 'Company Dashboard'}
            </h1>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              {isVerified ? (
                <span className="flex items-center gap-1 text-green-600 text-sm">
                  <ShieldCheck className="h-4 w-4" /> Verified company
                </span>
              ) : company?.status === 'rejected' ? (
                <span className="flex items-center gap-1 text-red-600 text-sm">
                  <AlertCircle className="h-4 w-4" /> Verification rejected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-amber-600 text-sm">
                  <AlertCircle className="h-4 w-4" /> Pending verification
                </span>
              )}
            </p>
          </div>
          {isVerified && (
            <Link
              href={`/${locale}/company/internships/new`}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              <Plus className="h-4 w-4" /> Post Internship
            </Link>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Open Internships', value: openCount ?? 0, icon: Briefcase, color: 'text-indigo-600 bg-indigo-50', href: `/${locale}/company/internships` },
            { label: 'Total Applicants', value: totalApps, icon: Users, color: 'text-purple-600 bg-purple-50', href: `/${locale}/company/applicants` },
            { label: 'Upcoming Interviews', value: upcomingInterviews, icon: Calendar, color: 'text-cyan-600 bg-cyan-50', href: `/${locale}/company/applicants?status=interview_scheduled` },
            { label: 'Active Interns', value: activeInterns ?? 0, icon: GraduationCap, color: 'text-green-600 bg-green-50', href: `/${locale}/company/interns` },
          ].map(({ label, value, icon: Icon, color, href }) => (
            <Link key={label} href={href}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="pt-4 pb-4">
                  <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mb-2`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-sm text-gray-500">{label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Application status chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Applications by Status
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <CompanyApplicationChart applications={applicationStatuses} />
            </CardContent>
          </Card>

          {/* Active internships */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Internship Listings</CardTitle>
                <Link href={`/${locale}/company/internships`} className="text-xs text-indigo-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="pb-4 divide-y">
              {(internships ?? []).map((i) => (
                <div key={i.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{i.title}</p>
                    <p className="text-xs text-gray-400">
                      {i.filled_slots}/{i.slots} slots · Due {new Date(i.deadline).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <StatusBadge status={i.status} />
                </div>
              ))}
              {!internships?.length && (
                <p className="py-4 text-sm text-gray-400 text-center">No internships yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent applicants */}
        {(recentApps ?? []).length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Recent Applicants</CardTitle>
                <Link href={`/${locale}/company/applicants`} className="text-xs text-indigo-600 hover:underline">View all</Link>
              </div>
            </CardHeader>
            <CardContent className="pb-4 divide-y">
              {recentApps!.map((app) => {
                const profile = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles as { full_name?: string } | null;
                const internship = Array.isArray(app.internships) ? app.internships[0] : app.internships as { title?: string } | null;
                return (
                  <div key={app.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">{(profile as { full_name?: string } | null)?.full_name ?? '—'}</p>
                      <p className="text-xs text-gray-400 truncate">{(internship as { title?: string } | null)?.title ?? '—'}</p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {app.match_score != null && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${app.match_score >= 70 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                          {app.match_score}%
                        </span>
                      )}
                      <StatusBadge status={app.status} />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
