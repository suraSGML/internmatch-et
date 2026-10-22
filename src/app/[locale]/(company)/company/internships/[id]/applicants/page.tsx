import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ApplicationStatusActions } from './ApplicationStatusActions';
import { ArrowLeft, Users, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

const PIPELINE_STAGES = [
  { status: 'submitted',           label: 'Submitted',    color: 'bg-blue-50   border-blue-200' },
  { status: 'under_review',        label: 'Reviewing',    color: 'bg-purple-50 border-purple-200' },
  { status: 'shortlisted',         label: 'Shortlisted',  color: 'bg-indigo-50 border-indigo-200' },
  { status: 'interview_scheduled', label: 'Interview',    color: 'bg-cyan-50   border-cyan-200' },
  { status: 'offered',             label: 'Offered',      color: 'bg-amber-50  border-amber-200' },
  { status: 'accepted',            label: 'Accepted',     color: 'bg-green-50  border-green-200' },
];

export default async function ApplicantsPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: internship } = await service
    .from('internships')
    .select('id, title, company_id, slots, filled_slots, status')
    .eq('id', id)
    .single();
  if (!internship) notFound();

  // Verify company ownership
  const { data: membership } = await service
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single();
  if (membership?.company_id !== internship.company_id) redirect(`/${locale}/company/internships`);

  const { data: applications, error: applicationsError } = await service
    .from('applications')
    .select(`
      id, status, match_score, cover_note, tags, created_at,
      student_id,
      profiles!applications_student_id_fkey(full_name, phone, city)
    `)
    .eq('internship_id', id)
    .order('match_score', { ascending: false });
  if (applicationsError) throw new Error(`Could not load applicants: ${applicationsError.message}`);

  const studentIds = [...new Set((applications ?? []).map((application) => application.student_id))];
  const studentProfilesByUser = new Map<string, Record<string, unknown>>();
  if (studentIds.length > 0) {
    const { data: studentProfiles, error: studentProfilesError } = await service
      .from('student_profiles')
      .select('user_id, skills, bio, university_id, year_of_study, cv_url, universities(name), departments(name)')
      .in('user_id', studentIds);
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

  const byStage = PIPELINE_STAGES.map((stage) => ({
    ...stage,
    apps: applicationsWithStudents.filter((a) => a.status === stage.status),
  }));

  const totalActive = applicationsWithStudents.filter(
    (a) => !['rejected', 'withdrawn', 'declined'].includes(a.status)
  ).length;

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-5">
        <div className="flex items-center gap-3">
          <Link
            href={`/${locale}/company/internships`}
            className="text-gray-400 hover:text-gray-700"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-900">{internship.title as string}</h1>
            <p className="text-gray-500 text-sm">
              {totalActive} active applicant{totalActive !== 1 ? 's' : ''} ·{' '}
              {internship.filled_slots}/{internship.slots} slots filled
            </p>
          </div>
        </div>

        {/* Kanban pipeline */}
        <div className="overflow-x-auto pb-2">
          <div className="flex gap-4 min-w-max">
            {byStage.map((stage) => (
              <div key={stage.status} className="w-64 flex-shrink-0">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    {stage.label}
                  </span>
                  <Badge variant="secondary" className="text-xs h-5">
                    {stage.apps.length}
                  </Badge>
                </div>
                <div className={`rounded-xl border p-2 min-h-[100px] space-y-2 ${stage.color}`}>
                  {stage.apps.map((app) => {
                    const profile = Array.isArray(app.profiles) ? app.profiles[0] : app.profiles as Record<string, unknown> | null;
                    const sp = Array.isArray(app.student_profiles) ? app.student_profiles[0] : app.student_profiles as Record<string, unknown> | null;
                    const uni = sp ? (Array.isArray((sp as Record<string, unknown>).universities) ? ((sp as Record<string, unknown>).universities as Array<{ name: string }>)[0] : (sp as Record<string, unknown>).universities as { name: string } | null) : null;

                    return (
                      <Card key={app.id} className="border-0 shadow-sm">
                        <CardContent className="p-3 space-y-2">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                              <User className="h-3.5 w-3.5 text-indigo-600" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-sm text-gray-900 truncate">
                                {(profile as { full_name?: string })?.full_name ?? 'Applicant'}
                              </p>
                              {(uni as { name?: string })?.name && (
                                <p className="text-xs text-gray-400 truncate">
                                  {(uni as { name: string }).name}
                                </p>
                              )}
                            </div>
                          </div>

                          {app.match_score != null && (
                            <div className={`text-xs font-bold text-center py-0.5 rounded-full ${
                              app.match_score >= 70 ? 'bg-green-100 text-green-700' :
                              app.match_score >= 40 ? 'bg-amber-100 text-amber-700' :
                              'bg-gray-100 text-gray-500'
                            }`}>
                              {app.match_score}% match
                            </div>
                          )}

                          <ApplicationStatusActions
                            applicationId={app.id}
                            currentStatus={app.status}
                          />
                        </CardContent>
                      </Card>
                    );
                  })}
                  {stage.apps.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-3">Empty</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {!applicationsWithStudents.length && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-gray-400">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No applications yet for this internship.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
