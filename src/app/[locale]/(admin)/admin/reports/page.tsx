import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { BarChart2, Users, Briefcase, GraduationCap, Building2, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { ResolveReportButton } from './ResolveReportButton';

export const dynamic = 'force-dynamic';

const REASON_LABELS: Record<string, string> = {
  fake_posting:      'Fake Posting',
  asking_for_money:  'Asking for Money',
  harassment:        'Harassment',
  discrimination:    'Discrimination',
  other:             'Other',
};

const STATUS_COLORS: Record<string, string> = {
  open:          'bg-red-100 text-red-700',
  investigating: 'bg-amber-100 text-amber-700',
  resolved:      'bg-green-100 text-green-700',
  dismissed:     'bg-gray-100 text-gray-500',
};

export default async function AdminReportsPage({
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

  // ── Platform-wide stats ───────────────────────────────────────────────────
  const [
    { count: totalUsers },
    { count: totalStudents },
    { count: totalCompany },
    { count: totalUni },
    { count: suspended },
    { count: totalInternships },
    { count: openInternships },
    { count: draftInternships },
    { count: filledInternships },
    { count: totalApplications },
    { count: acceptedApplications },
    { count: activePlacements },
    { count: completedPlacements },
    { data: reports },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'company'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'university'),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('is_suspended', true),
    supabase.from('internships').select('*', { count: 'exact', head: true }),
    supabase.from('internships').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('internships').select('*', { count: 'exact', head: true }).eq('status', 'draft'),
    supabase.from('internships').select('*', { count: 'exact', head: true }).eq('status', 'filled'),
    supabase.from('applications').select('*', { count: 'exact', head: true }),
    supabase.from('applications').select('*', { count: 'exact', head: true }).eq('status', 'accepted'),
    supabase.from('placements').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('placements').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('reports')
      .select('id, reason, details, status, target_type, target_id, created_at, profiles!reports_reporter_id_fkey(full_name)')
      .order('created_at', { ascending: false }),
  ]);

  const allReports = reports ?? [];
  const openReports      = allReports.filter((r) => r.status === 'open');
  const investigatingRep = allReports.filter((r) => r.status === 'investigating');
  const resolvedRep      = allReports.filter((r) => r.status === 'resolved');

  const conversionRate = (totalApplications ?? 0) > 0
    ? Math.round(((acceptedApplications ?? 0) / (totalApplications ?? 1)) * 100)
    : 0;

  type ReportRow = NonNullable<typeof reports>[number];
  function getReporter(r: ReportRow) {
    const p = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles as { full_name?: string } | null;
    return (p as { full_name?: string } | null)?.full_name ?? 'Anonymous';
  }

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart2 className="h-6 w-6 text-indigo-600" />
            Platform Reports
          </h1>
          <p className="text-gray-500 mt-1">Platform-wide statistics and abuse reports.</p>
        </div>

        {/* User breakdown */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Users</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Users',   value: totalUsers ?? 0,    icon: Users,       color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Students',      value: totalStudents ?? 0, icon: GraduationCap, color: 'text-blue-600 bg-blue-50' },
              { label: 'Companies',     value: totalCompany ?? 0,  icon: Building2,   color: 'text-purple-600 bg-purple-50' },
              { label: 'Suspended',     value: suspended ?? 0,     icon: AlertCircle, color: 'text-red-600 bg-red-50' },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className={`w-9 h-9 rounded-lg flex items-center justify-center mb-2 ${color}`}>
                    <Icon className="h-4 w-4" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Internship + application stats */}
        <div>
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Internships & Applications</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Total Internships', value: totalInternships ?? 0 },
              { label: 'Open',              value: openInternships ?? 0 },
              { label: 'Filled',            value: filledInternships ?? 0 },
              { label: 'Drafts',            value: draftInternships ?? 0 },
            ].map(({ label, value }) => (
              <Card key={label} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-4 text-center">
                  <p className="text-2xl font-bold text-gray-900">{value}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {[
              { label: 'Total Applications', value: totalApplications ?? 0, sub: 'All time' },
              { label: 'Accepted',           value: acceptedApplications ?? 0, sub: `${conversionRate}% conversion rate` },
              { label: 'Active Placements',  value: activePlacements ?? 0, sub: `${completedPlacements ?? 0} completed` },
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

        {/* Abuse reports */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Abuse Reports
            </h2>
            <div className="flex gap-2 text-xs">
              <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">{openReports.length} open</span>
              <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">{investigatingRep.length} investigating</span>
              <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">{resolvedRep.length} resolved</span>
            </div>
          </div>

          {allReports.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-gray-400">
                <CheckCircle2 className="h-10 w-10 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No reports filed</p>
                <p className="text-sm mt-1">Abuse reports from students and companies will appear here.</p>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Reporter</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Reason</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Target</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                        <th className="text-left px-4 py-3 font-medium text-gray-600">Date</th>
                        <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {allReports.map((r) => (
                        <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3 text-gray-700">{getReporter(r)}</td>
                          <td className="px-4 py-3">
                            <span className="text-xs font-medium text-gray-700">
                              {REASON_LABELS[r.reason] ?? r.reason}
                            </span>
                            {r.details && (
                              <p className="text-xs text-gray-400 mt-0.5 max-w-[200px] truncate">{r.details}</p>
                            )}
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">
                            <span className="capitalize font-medium text-gray-700">{r.target_type}</span>
                            <span className="block font-mono text-gray-400 truncate max-w-[100px]">
                              {r.target_id?.slice(0, 8)}…
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_COLORS[r.status] ?? 'bg-gray-100 text-gray-500'}`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-400 whitespace-nowrap">
                            {new Date(r.created_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <ResolveReportButton
                              reportId={r.id}
                              currentStatus={r.status}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
