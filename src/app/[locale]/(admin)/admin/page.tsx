import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import {
  Building2, GraduationCap, Users, Shield, Briefcase,
  AlertCircle, TrendingUp, ArrowRight,
  FileText, BarChart2, Flag
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage({
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

  // ── Fetch all platform stats in parallel ────────────────────────────────────
  const [
    { count: totalUsers },
    { count: totalStudents },
    { count: totalCompanies },
    { count: totalUniversities },
    { count: pendingCompanies },
    { count: pendingUniversities },
    { count: totalInternships },
    { count: openInternships },
    { count: totalApplications },
    { count: activePlacements },
    { count: openReports },
    { count: openListingReports },
    { data: recentCompanies },
    { data: recentUsers },
    { data: recentAudit },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }),
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'student'),
    supabase.from('companies').select('*', { count: 'exact', head: true }),
    supabase.from('universities').select('*', { count: 'exact', head: true }),
    supabase.from('companies').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('universities').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('internships').select('*', { count: 'exact', head: true }),
    supabase.from('internships').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('applications').select('*', { count: 'exact', head: true }),
    supabase.from('placements').select('*', { count: 'exact', head: true }).eq('status', 'active'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('listing_reports').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('companies')
      .select('id, name, status, industry, city, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('profiles')
      .select('id, full_name, role, created_at')
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('audit_logs')
      .select('id, action, target_type, created_at, profiles!audit_logs_actor_id_fkey(full_name)')
      .order('created_at', { ascending: false })
      .limit(6),
  ]);

  const [
    { data: pendingCoordinatorRequests, error: coordinatorRequestsError },
    { data: linkedUserIds, error: linkedUserIdsError },
  ] = await Promise.all([
    supabase
      .from('university_registration_requests')
      .select('user_id')
      .eq('status', 'pending'),
    supabase.from('university_members').select('user_id'),
  ]);
  if (coordinatorRequestsError) {
    throw new Error(`Could not load pending coordinator requests: ${coordinatorRequestsError.message}`);
  }
  if (linkedUserIdsError) {
    throw new Error(`Could not load assigned university coordinators: ${linkedUserIdsError.message}`);
  }

  const linkedSet = new Set((linkedUserIds ?? []).map((member) => member.user_id));
  const unlinkedCoordinators = new Set(
    (pendingCoordinatorRequests ?? [])
      .map((request) => request.user_id)
      .filter((userId) => !linkedSet.has(userId))
  ).size;

  const needsAttention = (pendingCompanies ?? 0) + (pendingUniversities ?? 0) + (openReports ?? 0) + (openListingReports ?? 0) + unlinkedCoordinators;

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
            <p className="text-gray-500 mt-1">Platform overview and management.</p>
          </div>
          {needsAttention > 0 && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span><strong>{needsAttention}</strong> item{needsAttention !== 1 ? 's' : ''} need attention</span>
            </div>
          )}
        </div>

        {/* Attention cards */}
        {needsAttention > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
            {(pendingCompanies ?? 0) > 0 && (
              <Link href={`/${locale}/admin/companies`}>
                <Card className="border-amber-200 bg-amber-50 border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <Building2 className="h-8 w-8 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-2xl font-bold text-amber-700">{pendingCompanies}</p>
                      <p className="text-xs text-amber-600">Companies pending verification</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
            {(pendingUniversities ?? 0) > 0 && (
              <Link href={`/${locale}/admin/universities`}>
                <Card className="border-amber-200 bg-amber-50 border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <GraduationCap className="h-8 w-8 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-2xl font-bold text-amber-700">{pendingUniversities}</p>
                      <p className="text-xs text-amber-600">Universities pending verification</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
            {(openListingReports ?? 0) > 0 && (
              <Link href={`/${locale}/admin/listing-reports`}>
                <Card className="border-amber-200 bg-amber-50 border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <Flag className="h-8 w-8 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-2xl font-bold text-amber-700">{openListingReports}</p>
                      <p className="text-xs text-amber-600">Internship listings reported</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
            {unlinkedCoordinators > 0 && (
              <Link href={`/${locale}/admin/universities`}>
                <Card className="border-amber-200 bg-amber-50 border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <Users className="h-8 w-8 text-amber-600 shrink-0" />
                    <div>
                      <p className="text-2xl font-bold text-amber-700">{unlinkedCoordinators}</p>
                      <p className="text-xs text-amber-600">Coordinators awaiting assignment</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
            {(openReports ?? 0) > 0 && (
              <Link href={`/${locale}/admin/reports`}>
                <Card className="border-red-200 bg-red-50 border shadow-sm hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="pt-4 pb-4 flex items-center gap-3">
                    <Shield className="h-8 w-8 text-red-500 shrink-0" />
                    <div>
                      <p className="text-2xl font-bold text-red-600">{openReports}</p>
                      <p className="text-xs text-red-500">Open reports</p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            )}
          </div>
        )}

        {/* Platform KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Users',       value: totalUsers ?? 0,       icon: Users,       color: 'text-indigo-600 bg-indigo-50',  href: `/${locale}/admin/users` },
            { label: 'Companies',         value: totalCompanies ?? 0,   icon: Building2,   color: 'text-purple-600 bg-purple-50',  href: `/${locale}/admin/companies` },
            { label: 'Open Internships',  value: openInternships ?? 0,  icon: Briefcase,   color: 'text-green-600 bg-green-50',    href: `/${locale}/admin/reports` },
            { label: 'Active Placements', value: activePlacements ?? 0, icon: TrendingUp,  color: 'text-amber-600 bg-amber-50',    href: `/${locale}/admin/reports` },
          ].map(({ label, value, icon: Icon, color, href }) => (
            <Link key={label} href={href}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
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

        {/* Secondary stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Students',         value: totalStudents ?? 0 },
            { label: 'Universities',     value: totalUniversities ?? 0 },
            { label: 'Total Internships',value: totalInternships ?? 0 },
            { label: 'Applications',     value: totalApplications ?? 0 },
          ].map(({ label, value }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="pt-3 pb-3 text-center">
                <p className="text-xl font-bold text-gray-800">{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Recent companies */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-indigo-500" />
                  Recent Companies
                </CardTitle>
                <Link href={`/${locale}/admin/companies`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="divide-y pb-2">
              {(recentCompanies ?? []).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.name}</p>
                    <p className="text-xs text-gray-400">{c.industry ?? '—'} · {c.city ?? '—'}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
              ))}
              {!recentCompanies?.length && (
                <p className="py-4 text-sm text-gray-400 text-center">No companies yet.</p>
              )}
            </CardContent>
          </Card>

          {/* Recent users */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                  <Users className="h-4 w-4 text-indigo-500" />
                  Recent Users
                </CardTitle>
                <Link href={`/${locale}/admin/users`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  View all <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </CardHeader>
            <CardContent className="divide-y pb-2">
              {(recentUsers ?? []).map((u) => (
                <div key={u.id} className="flex items-center justify-between py-2.5 gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-700 shrink-0">
                      {u.full_name?.charAt(0) ?? '?'}
                    </div>
                    <p className="text-sm font-medium text-gray-800 truncate">{u.full_name}</p>
                  </div>
                  <Badge className="text-xs capitalize bg-gray-100 text-gray-600 hover:bg-gray-100">
                    {u.role}
                  </Badge>
                </div>
              ))}
              {!recentUsers?.length && (
                <p className="py-4 text-sm text-gray-400 text-center">No users yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent audit log */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Shield className="h-4 w-4 text-indigo-500" />
                Recent Audit Activity
              </CardTitle>
              <Link href={`/${locale}/admin/audit`} className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                Full log <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </CardHeader>
          <CardContent className="pb-2">
            {(recentAudit ?? []).length === 0 ? (
              <p className="py-4 text-sm text-gray-400 text-center">
                No audit entries yet. Verifying companies or suspending users will create entries here.
              </p>
            ) : (
              <div className="divide-y">
                {(recentAudit ?? []).map((log) => {
                  const actor = Array.isArray(log.profiles) ? log.profiles[0] : log.profiles as { full_name?: string } | null;
                  return (
                    <div key={log.id} className="flex items-center justify-between py-2.5 gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 font-mono">{log.action}</p>
                        <p className="text-xs text-gray-400">
                          {(actor as { full_name?: string } | null)?.full_name ?? 'System'}
                          {log.target_type ? ` · ${log.target_type}` : ''}
                        </p>
                      </div>
                      <p className="text-xs text-gray-400 shrink-0">
                        {new Date(log.created_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Verify Companies',   href: `/${locale}/admin/companies`,   icon: Building2,    color: 'text-purple-600 bg-purple-50' },
            { label: 'Manage Users',        href: `/${locale}/admin/users`,       icon: Users,        color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Platform Reports',    href: `/${locale}/admin/reports`,     icon: BarChart2,    color: 'text-green-600 bg-green-50' },
            { label: 'Fields & Skills',     href: `/${locale}/admin/fields`,      icon: FileText,     color: 'text-amber-600 bg-amber-50' },
          ].map(({ label, href, icon: Icon, color }) => (
            <Link key={label} href={href}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-4 pb-4 text-center">
                  <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center mx-auto mb-2`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <p className="text-xs font-medium text-gray-700">{label}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
