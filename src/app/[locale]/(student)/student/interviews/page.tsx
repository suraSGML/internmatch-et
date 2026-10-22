import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Video, Phone, Clock, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentInterviewsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: interviews, error: interviewsError } = await service
    .from('interviews')
    .select(`
      id, scheduled_at, mode, location_or_link, status, notes,
      applications!inner(
        id, status,
        internships(title, companies(name))
      )
    `)
    .eq('applications.student_id', user.id)
    .order('scheduled_at', { ascending: true });
  if (interviewsError) {
    throw new Error(`Could not load your interview schedule: ${interviewsError.message}`);
  }

  const upcoming = (interviews ?? []).filter((interview) => {
    const application = Array.isArray(interview.applications)
      ? interview.applications[0]
      : interview.applications;
    return (
      new Date(interview.scheduled_at) >= new Date() &&
      interview.status === 'scheduled' &&
      application?.status === 'interview_scheduled'
    );
  });
  const past = (interviews ?? []).filter(
    (interview) => !upcoming.some((upcomingInterview) => upcomingInterview.id === interview.id)
  );
  const renderTime = new Date().getTime();
  const interviewsSoon = upcoming.filter((interview) =>
    new Date(interview.scheduled_at).getTime() - renderTime <= 24 * 60 * 60 * 1000
  );

  const ModeIcon = ({ mode }: { mode: string }) => {
    if (mode === 'online') return <Video className="h-4 w-4 text-indigo-500" />;
    if (mode === 'phone') return <Phone className="h-4 w-4 text-green-500" />;
    return <Building2 className="h-4 w-4 text-orange-500" />;
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Interviews</h1>
          <p className="text-gray-500 mt-1">
            {upcoming.length} upcoming · {past.length} past
          </p>
          <p className="text-sm text-gray-500 mt-2">
            Interview times are shown in East Africa Time (EAT, UTC+3). Check each interview for its location, meeting link, phone number, and preparation notes.
          </p>
        </div>

        {upcoming.length > 0 && (
          <div className="space-y-3">
            {interviewsSoon.length > 0 && (
              <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {interviewsSoon.length === 1
                  ? 'Reminder: you have an interview within the next 24 hours. Check its time, location, or meeting link.'
                  : `Reminder: you have ${interviewsSoon.length} interviews within the next 24 hours. Check their times and meeting details.`}
              </div>
            )}
            <h2 className="text-sm font-semibold text-indigo-700 uppercase tracking-wide">
              Upcoming
            </h2>
            {upcoming.map((interview) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const app = Array.isArray(interview.applications) ? (interview.applications as any[])[0] : interview.applications as any;
              const internship = app ? (Array.isArray(app.internships) ? app.internships[0] : app.internships) : null;
              const company = internship ? (Array.isArray(internship.companies) ? internship.companies[0] : internship.companies) : null;
              const dt = new Date(interview.scheduled_at);
              const hoursUntil = Math.max(0, Math.ceil((dt.getTime() - renderTime) / (1000 * 60 * 60)));

              return (
                <Card key={interview.id} className="border-0 shadow-sm border-l-4 border-l-indigo-500">
                  <CardContent className="pt-4 pb-4">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900">{internship?.title ?? '—'}</p>
                        <p className="text-sm text-gray-500">{company?.name ?? '—'}</p>
                        {hoursUntil <= 24 && (
                          <p className="mt-1 text-xs font-medium text-amber-700">
                            Starts {hoursUntil === 0 ? 'within the hour' : `in about ${hoursUntil} hour${hoursUntil === 1 ? '' : 's'}`}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1.5">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            {dt.toLocaleDateString('en-ET', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              timeZone: 'Africa/Addis_Ababa',
                            })}
                          </span>
                          <span className="flex items-center gap-1.5">
                            <Clock className="h-4 w-4 text-gray-400" />
                            {dt.toLocaleTimeString('en-ET', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Africa/Addis_Ababa',
                            })} EAT
                          </span>
                          <span className="flex items-center gap-1.5">
                            <ModeIcon mode={interview.mode} />
                            <span>Format: {interview.mode.replace(/_/g, ' ').replace(/\b\w/g, (letter: string) => letter.toUpperCase())}</span>
                          </span>
                        </div>
                        {interview.location_or_link && (
                          interview.mode === 'online' ? (
                            <a
                              href={interview.location_or_link}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-block text-sm text-indigo-600 hover:underline mt-1"
                            >
                              Join video interview
                            </a>
                          ) : interview.mode === 'phone' ? (
                            <p className="text-sm text-gray-500 mt-1">
                              Call: <a href={`tel:${interview.location_or_link}`} className="text-indigo-600 hover:underline">{interview.location_or_link}</a>
                            </p>
                          ) : (
                            <p className="text-sm text-gray-500 mt-1">
                              Meeting location: {interview.location_or_link}
                            </p>
                          )
                        )}
                        {interview.notes && (
                          <p className="text-xs text-gray-400 mt-1 italic">{interview.notes}</p>
                        )}
                        <a
                          href={`/api/interviews/${interview.id}/ics`}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline mt-2"
                          download
                        >
                          📅 Add to Calendar (.ics)
                        </a>
                      </div>
                      <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100">
                        {interview.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {past.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Past
            </h2>
            {past.map((interview) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const app = Array.isArray(interview.applications) ? (interview.applications as any[])[0] : interview.applications as any;
              const internship = app ? (Array.isArray(app.internships) ? app.internships[0] : app.internships) : null;
              const company = internship ? (Array.isArray(internship.companies) ? internship.companies[0] : internship.companies) : null;
              const dt = new Date(interview.scheduled_at);

              return (
                <Card key={interview.id} className="border-0 shadow-sm opacity-70">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-gray-700 text-sm">{internship?.title ?? '—'}</p>
                        <p className="text-xs text-gray-400">{company?.name ?? '—'} · {dt.toLocaleDateString('en-ET', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric',
                          timeZone: 'Africa/Addis_Ababa',
                        })}</p>
                      </div>
                      <Badge variant="outline" className="text-xs capitalize">
                        {(Array.isArray(interview.applications)
                          ? interview.applications[0]?.status
                          : interview.applications)?.status === 'offered'
                          ? 'Offer Sent · Interview Closed'
                          : (Array.isArray(interview.applications)
                              ? interview.applications[0]?.status
                              : interview.applications)?.status === 'accepted'
                            ? 'Offer Accepted'
                            : interview.status}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {!interviews?.length && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-gray-400">
              <Calendar className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No interviews scheduled</p>
              <p className="text-sm mt-1">Interviews will appear here once a company schedules one.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
