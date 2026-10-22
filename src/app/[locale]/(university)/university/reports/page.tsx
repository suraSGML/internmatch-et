import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ReportDownloadButtons } from './ReportDownloadButtons';
import { BarChart2, FileText } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UniversityReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: membership } = await supabase
    .from('university_members')
    .select('university_id')
    .eq('user_id', user.id)
    .single();
  if (!membership) redirect(`/${locale}/university/settings`);

  const uniId = membership.university_id;

  // Aggregate stats for the report preview
  const [
    { count: students },
    { data: placements },
    { data: deptBreakdown },
  ] = await Promise.all([
    supabase.from('student_profiles').select('*', { count: 'exact', head: true }).eq('university_id', uniId),
    supabase.from('placements').select('status, companies(name, city)').eq('university_id', uniId),
    supabase
      .from('student_profiles')
      .select('department_id, departments(name)')
      .eq('university_id', uniId),
  ]);

  const active = (placements ?? []).filter(p => ['active', 'approved'].includes(p.status)).length;
  const completed = (placements ?? []).filter(p => p.status === 'completed').length;
  const placementRate = students ? Math.round(((active + completed) / students) * 100) : 0;

  // Count by department
  const deptCounts: Record<string, number> = {};
  (deptBreakdown ?? []).forEach((sp) => {
    const dept = Array.isArray(sp.departments) ? sp.departments[0] : sp.departments as { name?: string } | null;
    const name = (dept as { name?: string } | null)?.name ?? 'Unknown';
    deptCounts[name] = (deptCounts[name] ?? 0) + 1;
  });

  // Top companies hosting interns
  const companyCounts: Record<string, number> = {};
  (placements ?? []).forEach((p) => {
    const company = Array.isArray(p.companies) ? p.companies[0] : p.companies as { name?: string } | null;
    const name = (company as { name?: string } | null)?.name ?? 'Unknown';
    companyCounts[name] = (companyCounts[name] ?? 0) + 1;
  });
  const topCompanies = Object.entries(companyCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5);

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="text-gray-500 mt-1">Placement statistics and exportable reports.</p>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Total Students', value: students ?? 0 },
            { label: 'Placement Rate', value: `${placementRate}%` },
            { label: 'Active', value: active },
            { label: 'Completed', value: completed },
          ].map(({ label, value }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-2xl font-bold text-indigo-700">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* By department */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-indigo-500" />
                Students by Department
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-2">
              {Object.entries(deptCounts)
                .sort(([, a], [, b]) => b - a)
                .slice(0, 6)
                .map(([dept, count]) => (
                  <div key={dept} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 flex-1 truncate">{dept}</span>
                    <div className="flex items-center gap-2">
                      <div
                        className="h-2 bg-indigo-400 rounded-full"
                        style={{ width: `${Math.round((count / (students ?? 1)) * 100)}px`, minWidth: 4 }}
                      />
                      <span className="text-xs font-medium text-gray-700 w-6 text-right">{count}</span>
                    </div>
                  </div>
                ))}
              {Object.keys(deptCounts).length === 0 && (
                <p className="text-sm text-gray-400">No data</p>
              )}
            </CardContent>
          </Card>

          {/* Top host companies */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <BarChart2 className="h-4 w-4 text-green-500" />
                Top Host Companies
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4 divide-y">
              {topCompanies.map(([name, count], i) => (
                <div key={name} className="py-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <span className="text-sm text-gray-700">{name}</span>
                  </div>
                  <span className="text-xs font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
                    {count} intern{count !== 1 ? 's' : ''}
                  </span>
                </div>
              ))}
              {topCompanies.length === 0 && <p className="text-sm text-gray-400 py-2">No placements yet</p>}
            </CardContent>
          </Card>
        </div>

        {/* Export */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <FileText className="h-4 w-4 text-gray-500" />
              Export Reports
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <ReportDownloadButtons universityId={uniId} />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
