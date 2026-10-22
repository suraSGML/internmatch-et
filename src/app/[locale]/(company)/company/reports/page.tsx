import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart2, Users, Briefcase, GraduationCap, TrendingUp, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CompanyReportsPage({
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
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) throw new Error(`Could not load company membership: ${membershipError.message}`);
  if (!membership) redirect(`/${locale}/onboarding`);

  const companyId = membership.company_id;

  // Fetch all internship IDs for this company
  const { data: internshipRows, error: internshipError } = await service
    .from('internships')
    .select('id, title, status, slots, filled_slots, deadline, created_at, work_mode')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (internshipError) throw new Error(`Could not load company internships: ${internshipError.message}`);

  const internshipIds = (internshipRows ?? []).map((i) => i.id);
  const emptyId = '00000000-0000-0000-0000-000000000000';
  const safeIds = internshipIds.length ? internshipIds : [emptyId];

  // Fetch all applications for this company's internships
  const { data: applications, error: applicationsError } = await service
    .from('applications')
    .select('id, status, match_score, created_at, internship_id')
    .in('internship_id', safeIds);
  if (applicationsError) throw new Error(`Could not load company applications: ${applicationsError.message}`);

  const { data: placements, error: placementsError } = await service
    .from('placements')
    .select('id, status, created_at')
    .eq('company_id', companyId);
  if (placementsError) throw new Error(`Could not load company placements: ${placementsError.message}`);

  const { count: teamCount, error: teamError } = await service
    .from('company_members')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);
  if (teamError) throw new Error(`Could not load company team: ${teamError.message}`);

  const apps = applications ?? [];
  const allPlacements = placements ?? [];
  const allInternships = internshipRows ?? [];

  // ── Derived metrics ──────────────────────────────────────────────────────────
  const totalApps       = apps.length;
  const openInternships = allInternships.filter((i) => i.status === 'open').length;
  const draftCount      = allInternships.filter((i) => i.status === 'draft').length;
  const filledCount     = allInternships.filter((i) => i.status === 'filled').length;
  const activePlacements = allPlacements.filter((p) => p.status === 'active').length;
  const completedPlacements = allPlacements.filter((p) => p.status === 'completed').length;
  const acceptanceRate  = totalApps > 0
    ? Math.round((apps.filter((a) => a.status === 'accepted').length / totalApps) * 100)
    : 0;
  const avgMatchScore   = apps.length > 0 && apps.some((a) => a.match_score != null)
    ? Math.round(apps.reduce((s, a) => s + (a.match_score ?? 0), 0) / apps.filter((a) => a.match_score != null).length)
    : null;

  // Status breakdown
  const statusBreakdown: Record<string, number> = {};
  apps.forEach((a) => { statusBreakdown[a.status] = (statusBreakdown[a.status] ?? 0) + 1; });

  const STATUS_ORDER = ['submitted','under_review','shortlisted','interview_scheduled','offered','accepted','rejected','withdrawn'];
  const STATUS_COLORS: Record<string, string> = {
    submitted:           'bg-gray-400',
    under_review:        'bg-blue-400',
    shortlisted:         'bg-indigo-500',
    interview_scheduled: 'bg-purple-500',
    offered:             'bg-amber-500',
    accepted:            'bg-green-500',
    rejected:            'bg-red-400',
    withdrawn:           'bg-gray-300',
  };

  // Applications per internship (top 5)
  const appsPerInternship = allInternships
    .map((i) => ({
      title: i.title,
      count: apps.filter((a) => a.internship_id === i.id).length,
      slots: i.slots,
      filled: i.filled_slots,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Monthly applications (last 6 months)
  const monthly = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleDateString('en-ET', { month: 'short' });
    const count = apps.filter((a) => {
      const ad = new Date(a.created_at);
      return ad.getMonth() === d.getMonth() && ad.getFullYear() === d.getFullYear();
    }).length;
    return { label, count };
  });
  const maxMonthly = Math.max(...monthly.map((m) => m.count), 1);

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-indigo-600" />
            Reports & Analytics
          </h1>
          <p className="text-gray-500 mt-1">Overview of your hiring pipeline and intern activity.</p>
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Applications', value: totalApps, icon: Users, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Open Internships',   value: openInternships, icon: Briefcase, color: 'text-green-600 bg-green-50' },
            { label: 'Active Interns',     value: activePlacements, icon: GraduationCap, color: 'text-purple-600 bg-purple-50' },
            { label: 'Team Members',       value: teamCount ?? 0, icon: Users, color: 'text-amber-600 bg-amber-50' },
          ].map(({ label, value, icon: Icon, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-3 ${color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-2xl font-bold text-gray-900">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Application funnel */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Application Funnel
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2.5 pb-4">
              {STATUS_ORDER.filter((s) => (statusBreakdown[s] ?? 0) > 0).map((s) => {
                const count = statusBreakdown[s] ?? 0;
                const pct   = totalApps > 0 ? Math.round((count / totalApps) * 100) : 0;
                return (
                  <div key={s}>
                    <div className="flex justify-between text-xs text-gray-600 mb-1">
                      <span className="capitalize">{s.replace(/_/g, ' ')}</span>
                      <span className="font-medium">{count} <span className="text-gray-400">({pct}%)</span></span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${STATUS_COLORS[s] ?? 'bg-gray-400'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
              {totalApps === 0 && (
                <p className="text-xs text-gray-400 py-4 text-center">No applications yet.</p>
              )}
              <div className="pt-2 border-t flex items-center justify-between text-xs text-gray-500">
                <span>Acceptance rate</span>
                <span className="font-semibold text-green-600">{acceptanceRate}%</span>
              </div>
              {avgMatchScore != null && (
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>Avg match score</span>
                  <span className="font-semibold text-indigo-600">{avgMatchScore}%</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Monthly applications bar chart */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Clock className="h-4 w-4 text-indigo-500" />
                Applications Over Time
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="flex items-end gap-2 h-32">
                {monthly.map(({ label, count }) => (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs text-gray-500 font-medium">{count || ''}</span>
                    <div
                      className="w-full bg-indigo-500 rounded-t-sm transition-all"
                      style={{ height: `${Math.max((count / maxMonthly) * 100, count > 0 ? 4 : 0)}%`, minHeight: count > 0 ? '4px' : '0' }}
                    />
                    <span className="text-xs text-gray-400">{label}</span>
                  </div>
                ))}
              </div>
              {apps.length === 0 && (
                <p className="text-xs text-gray-400 text-center mt-4">No data yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Applications per internship */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Top Internships by Applications</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            {appsPerInternship.length === 0 ? (
              <p className="text-xs text-gray-400 py-4 text-center">No internships posted yet.</p>
            ) : (
              <div className="space-y-3">
                {appsPerInternship.map(({ title, count, slots, filled }) => {
                  const pct = Math.max(appsPerInternship[0]?.count ?? 1, 1);
                  return (
                    <div key={title}>
                      <div className="flex justify-between text-xs text-gray-600 mb-1">
                        <span className="truncate max-w-[60%] font-medium">{title}</span>
                        <span className="text-gray-400">{count} applicants · {filled}/{slots} slots</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-400 rounded-full"
                          style={{ width: `${Math.round((count / pct) * 100)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Placement summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { label: 'Internship Listings', value: allInternships.length, sub: `${openInternships} open · ${draftCount} draft · ${filledCount} filled` },
            { label: 'Placements',           value: allPlacements.length, sub: `${activePlacements} active · ${completedPlacements} completed` },
            { label: 'Conversion Rate',      value: totalApps > 0 ? `${acceptanceRate}%` : '—', sub: 'Applications → Accepted' },
          ].map(({ label, value, sub }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-5 text-center">
                <p className="text-3xl font-bold text-gray-900">{value}</p>
                <p className="text-sm font-medium text-gray-600 mt-1">{label}</p>
                <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
