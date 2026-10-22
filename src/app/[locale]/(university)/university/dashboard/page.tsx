import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PlacementRateChart } from './PlacementRateChart';
import { UniversityRegistrationRequestForm } from './UniversityRegistrationRequestForm';
import {
  GraduationCap, MapPin, FileText, ArrowRight,
  AlertCircle, TrendingUp, Clock
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UniversityDashboardPage({
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
    .from('university_members')
    .select('university_id, universities(name)')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) throw new Error(`Could not load coordinator university: ${membershipError.message}`);

  if (!membership) {
    const [{ data: request }, { data: universities }] = await Promise.all([
      supabase
        .from('university_registration_requests')
        .select('id, university_id, requested_university_name, status, review_note, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      supabase
        .from('universities')
        .select('id, name')
        .eq('status', 'verified')
        .order('name'),
    ]);

    const { data: requestedUniversity } = request?.university_id
      ? await supabase
          .from('universities')
          .select('name')
          .eq('id', request.university_id)
          .maybeSingle()
      : { data: null };

    return (
      <DashboardLayout locale={locale}>
        <div className="flex flex-col items-center justify-center py-12 text-center max-w-lg mx-auto px-4 gap-5">
          <div className="w-20 h-20 bg-amber-100 rounded-full flex items-center justify-center mb-5">
            {request?.status === 'pending'
              ? <Clock className="h-10 w-10 text-amber-600" />
              : <GraduationCap className="h-10 w-10 text-indigo-600" />}
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {request?.status === 'pending' ? 'University request under review' : 'Set up coordinator access'}
          </h1>
          <p className="text-gray-500 text-sm leading-relaxed mb-6">
            {request?.status === 'pending'
              ? `Your request for ${requestedUniversity?.name ?? request.requested_university_name ?? 'your university'} is awaiting administrator review. Once approved, your account will be linked automatically.`
              : request?.status === 'rejected'
                ? `Your previous request was declined${request.review_note ? `: ${request.review_note}` : ''}. You can submit a new request or contact the administrator.`
                : 'Choose your existing university or request that a new institution be added. An administrator must approve your request before coordinator features are available.'}
          </p>

          {request?.status !== 'pending' && (
            <UniversityRegistrationRequestForm universities={universities ?? []} />
          )}

          {/* User's email */}
          <div className="w-full bg-indigo-50 rounded-xl p-4 text-left">
            <p className="text-xs font-medium text-indigo-500 mb-1">Your registered email</p>
            <p className="text-sm font-mono font-semibold text-indigo-800 break-all">
              {user.email}
            </p>
          </div>

          <p className="text-xs text-gray-400">
            Contact:{' '}
            <a href="mailto:admin@internmatch.et" className="text-indigo-500 hover:underline">
              admin@internmatch.et
            </a>
          </p>
        </div>
      </DashboardLayout>
    );
  }

  const uniId = membership.university_id;
  const uniName = (Array.isArray(membership.universities)
    ? membership.universities[0]
    : membership.universities as { name?: string } | null)?.name ?? 'University';

  const [
    studentCountResult,
    studentIdsResult,
    placementsResult,
  ] = await Promise.all([
    service.from('student_profiles').select('*', { count: 'exact', head: true }).eq('university_id', uniId),
    service.from('student_profiles').select('user_id').eq('university_id', uniId),
    service.from('placements').select('id, student_id, status, created_at').eq('university_id', uniId),
  ]);
  if (studentCountResult.error) throw new Error(`Could not count university students: ${studentCountResult.error.message}`);
  if (studentIdsResult.error) throw new Error(`Could not load university student IDs: ${studentIdsResult.error.message}`);
  if (placementsResult.error) throw new Error(`Could not load university placements: ${placementsResult.error.message}`);

  const placements = placementsResult.data ?? [];
  const studentIds = (studentIdsResult.data ?? []).map((student) => student.user_id);
  let applicationCount = 0;
  if (studentIds.length > 0) {
    const applicationCountResult = await service
      .from('applications')
      .select('*', { count: 'exact', head: true })
      .in('student_id', studentIds);
    if (applicationCountResult.error) throw new Error(`Could not count university student applications: ${applicationCountResult.error.message}`);
    applicationCount = applicationCountResult.count ?? 0;
  }

  const placementIds = placements.map((placement) => placement.id);
  let letterCount = 0;
  if (placementIds.length > 0) {
    const { count, error } = await service
      .from('placement_letters')
      .select('*', { count: 'exact', head: true })
      .in('placement_id', placementIds)
      .is('revoked_at', null);
    if (error) throw new Error(`Could not count placement letters: ${error.message}`);
    letterCount = count ?? 0;
  }

  const studentCount = studentCountResult.count;
  const placementList = placements;
  const active = placementList.filter(p => p.status === 'active').length;
  const placedStudentCount = new Set(
    placementList
      .filter(p => ['approved', 'active', 'completed', 'terminated'].includes(p.status))
      .map(p => p.student_id)
  ).size;
  const pendingCount = placementList.filter(p => p.status === 'pending_approval').length;
  const placementRate = studentCount
    ? Math.round((placedStudentCount / studentCount) * 100)
    : 0;

  // Build chart data by month (last 6 months)
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const label = d.toLocaleDateString('en-ET', { month: 'short' });
    const placedStudents = new Set(placementList.filter(p => {
      const pd = new Date(p.created_at);
      return (
        pd.getMonth() === d.getMonth() &&
        pd.getFullYear() === d.getFullYear() &&
        ['approved', 'active', 'completed', 'terminated'].includes(p.status)
      );
    }).map(p => p.student_id));
    return { month: label, placements: placedStudents.size };
  });

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{uniName}</h1>
          <p className="text-gray-500 mt-1">Coordinator Dashboard</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Students', value: studentCount ?? 0, icon: GraduationCap, color: 'text-indigo-600 bg-indigo-50', href: `/${locale}/university/students` },
            { label: 'Active Placements', value: active, icon: MapPin, color: 'text-green-600 bg-green-50', href: `/${locale}/university/placements` },
            { label: 'Letters Issued', value: letterCount ?? 0, icon: FileText, color: 'text-purple-600 bg-purple-50', href: `/${locale}/university/letters` },
            { label: 'Pending Approval', value: pendingCount ?? 0, icon: AlertCircle, color: pendingCount ? 'text-amber-600 bg-amber-50' : 'text-gray-400 bg-gray-50', href: `/${locale}/university/placements` },
            { label: 'Student Applications', value: applicationCount, icon: GraduationCap, color: 'text-blue-600 bg-blue-50', href: `/${locale}/university/students` },
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
          {/* Placement rate */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-green-500" />
                Placement Rate
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="text-center mb-3">
                <p className={`text-4xl font-bold ${placementRate >= 50 ? 'text-green-600' : 'text-amber-600'}`}>
                  {placementRate}%
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {placedStudentCount} of {studentCount ?? 0} students placed
                </p>
              </div>
              <PlacementRateChart data={monthlyData} />
            </CardContent>
          </Card>

          {/* Quick links */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="pb-4 space-y-2">
              {[
                { label: 'Review pending placements', href: `/${locale}/university/placements`, badge: pendingCount ?? 0 },
                { label: 'Issue placement letters', href: `/${locale}/university/letters`, badge: 0 },
                { label: 'View student logbooks', href: `/${locale}/university/logbooks`, badge: 0 },
                { label: 'Post announcement', href: `/${locale}/university/announcements`, badge: 0 },
                { label: 'Export reports', href: `/${locale}/university/reports`, badge: 0 },
              ].map(({ label, href, badge }) => (
                <Link
                  key={label}
                  href={href}
                  className="flex items-center justify-between p-2.5 rounded-lg hover:bg-indigo-50 transition-colors group"
                >
                  <span className="text-sm text-gray-700 group-hover:text-indigo-700">{label}</span>
                  <div className="flex items-center gap-2">
                    {badge > 0 && (
                      <span className="text-xs bg-amber-100 text-amber-700 font-bold px-1.5 py-0.5 rounded-full">
                        {badge}
                      </span>
                    )}
                    <ArrowRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-indigo-500" />
                  </div>
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
