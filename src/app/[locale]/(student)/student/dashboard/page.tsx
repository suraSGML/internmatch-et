import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ProfileCompleteness } from '@/components/shared/ProfileCompleteness';
import { InternshipCard, type InternshipRow } from '@/components/internships/InternshipCard';
import {
  Send, Calendar, Bookmark, Award, Briefcase, ArrowRight,
  TrendingUp, Clock
} from 'lucide-react';

import { computeProfileCompleteness } from '@/lib/profileCompleteness';
import { computeMatchScore } from '@/lib/matching/matchScore';
import { isDepartmentEligible } from '@/lib/matching/departmentEligibility';

export const dynamic = 'force-dynamic';

export default async function StudentDashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();

  const [
    profileResult,
    studentProfileResult,
    applicationCountResult,
    savedCountResult,
    recentApplicationsResult,
    placementResult,
    certificateCountResult,
    interviewCountResult,
    recommendationsResult,
  ] = await Promise.all([
    service.from('profiles').select('full_name, phone, city, avatar_url').eq('id', user.id).maybeSingle(),
    service.from('student_profiles').select('*').eq('user_id', user.id).maybeSingle(),
    service.from('applications').select('*', { count: 'exact', head: true }).eq('student_id', user.id),
    service.from('saved_internships').select('*', { count: 'exact', head: true }).eq('user_id', user.id),
    service
      .from('applications')
      .select('id, status, created_at, internships(title, companies(name))')
      .eq('student_id', user.id)
      .order('created_at', { ascending: false })
      .limit(4),
    service
      .from('placements')
      .select('id, status, start_date, rejection_reason, companies(name), applications(internships(title))')
      .eq('student_id', user.id)
      .in('status', ['pending_approval', 'approved', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    service.from('certificates')
      .select('id, placements!inner(student_id)', { count: 'exact', head: true })
      .eq('placements.student_id', user.id)
      .is('revoked_at', null),
    service
      .from('interviews')
      .select('id, applications!inner(student_id, status)', { count: 'exact', head: true })
      .eq('applications.student_id', user.id)
      .eq('applications.status', 'interview_scheduled')
      .eq('status', 'scheduled')
      .gte('scheduled_at', new Date().toISOString()),
    service
      .from('internships')
      .select(`
        id, title, description, location_city, work_mode, duration_weeks, deadline, created_at,
        is_paid, stipend_amount, status, requires_university_approval, required_skills,
        required_department, required_year_min, start_date,
        companies(name, slug, logo_url, status), fields(name_en)
      `)
      .eq('status', 'open')
      .gte('deadline', new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Africa/Addis_Ababa',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(new Date()))
      .order('created_at', { ascending: false })
      .limit(30),
  ]);
  if (profileResult.error) throw new Error(`Could not load your profile: ${profileResult.error.message}`);
  if (studentProfileResult.error) throw new Error(`Could not load your student profile: ${studentProfileResult.error.message}`);
  if (applicationCountResult.error) throw new Error(`Could not count your applications: ${applicationCountResult.error.message}`);
  if (savedCountResult.error) throw new Error(`Could not count your saved internships: ${savedCountResult.error.message}`);
  if (recentApplicationsResult.error) throw new Error(`Could not load recent applications: ${recentApplicationsResult.error.message}`);
  if (placementResult.error) throw new Error(`Could not load your placement: ${placementResult.error.message}`);
  if (certificateCountResult.error) throw new Error(`Could not count your certificates: ${certificateCountResult.error.message}`);
  if (interviewCountResult.error) throw new Error(`Could not count your upcoming interviews: ${interviewCountResult.error.message}`);
  if (recommendationsResult.error) throw new Error(`Could not load recommended internships: ${recommendationsResult.error.message}`);

  const profile = profileResult.data;
  const sp = studentProfileResult.data;
  const appCount = applicationCountResult.count;
  const savedCount = savedCountResult.count;
  const recentApps = recentApplicationsResult.data;
  const placement = placementResult.data;
  const certCount = certificateCountResult.count;
  const upcomingInterviewCount = interviewCountResult.count;
  const departmentLookup = sp?.department_id
    ? await service.from('departments').select('name').eq('id', sp.department_id).maybeSingle()
    : null;
  if (departmentLookup?.error) {
    throw new Error(`Could not load your department for recommendations: ${departmentLookup.error.message}`);
  }
  const studentDepartment = departmentLookup?.data?.name ?? null;
  const recommendations = (recommendationsResult.data ?? [])
    .filter((internship) => {
      const company = Array.isArray(internship.companies) ? internship.companies[0] : internship.companies;
      const meetsStudyYear = !internship.required_year_min ||
        (sp?.year_of_study != null && sp.year_of_study >= internship.required_year_min);
      return company?.status === 'verified' && meetsStudyYear &&
        isDepartmentEligible(studentDepartment, internship.required_department);
    })
    .map((internship) => {
      const field = Array.isArray(internship.fields) ? internship.fields[0] : internship.fields;
      const result = computeMatchScore(
        {
          skills: (sp?.skills as Array<{ name: string; level?: string }> | null) ?? [],
          department: studentDepartment,
          city: profile?.city,
          availability: sp?.availability as { duration_weeks?: number; modes?: string[] } | null ?? {},
          year_of_study: sp?.year_of_study,
        },
        {
          required_skills: (internship.required_skills as Array<{ name: string; level?: string }>) ?? [],
          field_name: field?.name_en,
          required_department: internship.required_department,
          location_city: internship.location_city,
          work_mode: internship.work_mode,
          duration_weeks: internship.duration_weeks,
          start_date: internship.start_date,
          required_year_min: internship.required_year_min,
        }
      );
      return { internship: internship as unknown as InternshipRow, match: result };
    })
    .sort((a, b) => b.match.total - a.match.total)
    .slice(0, 3);

  const { percentage: completeness, missingItems: missing } = computeProfileCompleteness({
    fullName: profile?.full_name,
    phone: profile?.phone,
    city: profile?.city,
    avatarUrl: profile?.avatar_url,
    bio: sp?.bio,
    skills: sp?.skills as Array<unknown>,
    universityId: sp?.university_id,
    departmentId: sp?.department_id,
    yearOfStudy: sp?.year_of_study,
    cvUrl: sp?.cv_url,
  });

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        {/* Welcome */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {profile?.full_name?.split(' ')[0] ?? 'there'} 👋
          </h1>
          <p className="text-gray-500 mt-1">Here&apos;s your internship journey overview.</p>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Applications', value: appCount ?? 0, icon: Send, href: `/${locale}/student/applications`, color: 'text-indigo-600 bg-indigo-50' },
            { label: 'Upcoming Interviews', value: upcomingInterviewCount ?? 0, icon: Calendar, href: `/${locale}/student/interviews`, color: 'text-cyan-600 bg-cyan-50' },
            { label: 'Saved', value: savedCount ?? 0, icon: Bookmark, href: `/${locale}/student/saved`, color: 'text-amber-600 bg-amber-50' },
            { label: 'Certificates', value: certCount ?? 0, icon: Award, href: `/${locale}/student/certificates`, color: 'text-green-600 bg-green-50' },
          ].map(({ label, value, icon: Icon, href, color }) => (
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

        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Recommended for you</h2>
              <p className="text-sm text-gray-500">Open roles ranked using your skills, field, location, availability, and study year.</p>
            </div>
            <Link href={`/${locale}/internships`} className="text-sm text-indigo-600 hover:underline">Browse all</Link>
          </div>
          {recommendations.length ? (
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
              {recommendations.map(({ internship, match }) => (
                <div key={internship.id} className="space-y-2">
                  <InternshipCard internship={internship} locale={locale} matchScore={match.total} />
                  {match.explanation.length > 0 && (
                    <p className="px-2 text-xs text-gray-500">Why: {match.explanation.slice(0, 2).join(' · ')}</p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-6 text-sm text-gray-500">
                No open matches right now. Complete your skills and availability for more relevant recommendations.
              </CardContent>
            </Card>
          )}
        </section>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Profile completeness */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 text-indigo-500" />
                Profile Strength
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <ProfileCompleteness
                percentage={completeness}
                missingItems={missing}
              />
              {completeness < 80 && (
                <Link
                  href={`/${locale}/student/profile`}
                  className="mt-3 text-xs text-indigo-600 hover:underline flex items-center gap-1 font-medium"
                >
                  Complete profile <ArrowRight className="h-3 w-3" />
                </Link>
              )}
            </CardContent>
          </Card>

          {/* Active placement */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-green-500" />
                Current Placement
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              {placement ? (
                <div className="space-y-2">
                  {(() => {
                    const app = Array.isArray(placement.applications) ? placement.applications[0] : placement.applications as Record<string, unknown> | null;
                    const internship = app ? (Array.isArray((app as Record<string, unknown>).internships) ? ((app as Record<string, unknown>).internships as Array<{ title?: string }>)[0] : (app as Record<string, unknown>).internships as { title?: string } | null) : null;
                    const company = Array.isArray(placement.companies) ? placement.companies[0] : placement.companies as { name?: string } | null;
                    return (
                      <>
                        <p className="font-semibold text-gray-900 text-sm">
                          {(internship as { title?: string } | null)?.title ?? 'Internship'}
                        </p>
                        <p className="text-xs text-indigo-600">{(company as { name?: string } | null)?.name}</p>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={placement.status} />
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            Since {new Date(placement.start_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                          </span>
                        </div>
                        {placement.status === 'active' && (
                        <Link
                          href={`/${locale}/student/logbook`}
                          className="text-xs text-indigo-600 hover:underline font-medium flex items-center gap-1 mt-1"
                        >
                          Open logbook <ArrowRight className="h-3 w-3" />
                        </Link>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                <div className="text-center py-4 text-gray-400">
                  <Briefcase className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No active placement</p>
                  <Link href={`/${locale}/internships`} className="text-xs text-indigo-600 hover:underline mt-1 inline-block">
                    Browse internships →
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent applications */}
        {(recentApps ?? []).length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold text-gray-700">Recent Applications</CardTitle>
                <Link href={`/${locale}/student/applications`} className="text-xs text-indigo-600 hover:underline">
                  View all
                </Link>
              </div>
            </CardHeader>
            <CardContent className="pb-4 divide-y">
              {recentApps!.map((app) => {
                const internship = Array.isArray(app.internships) ? app.internships[0] : app.internships as { title?: string } | null;
                return (
                  <div key={app.id} className="py-2.5 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {(internship as { title?: string } | null)?.title ?? '—'}
                      </p>
                      <p className="text-xs text-gray-400">
                        {new Date(app.created_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                      </p>
                    </div>
                    <StatusBadge status={app.status} />
                  </div>
                );
              })}
            </CardContent>
          </Card>
        )}

        {/* Quick actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: 'Find Internships', href: `/${locale}/internships`, icon: Briefcase },
            { label: 'Update Profile', href: `/${locale}/student/profile`, icon: TrendingUp },
            { label: 'Download CV', href: `/${locale}/student/cv`, icon: Award },
            { label: 'My Logbook', href: `/${locale}/student/logbook`, icon: Calendar },
          ].map(({ label, href, icon: Icon }) => (
            <Link key={label} href={href}>
              <Card className="border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer h-full">
                <CardContent className="pt-4 pb-4 text-center">
                  <Icon className="h-5 w-5 text-indigo-500 mx-auto mb-1.5" />
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
