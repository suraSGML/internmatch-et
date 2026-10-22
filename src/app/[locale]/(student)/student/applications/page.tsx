import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { WithdrawButton } from './WithdrawButton';
import { Building2, Calendar, Clock, Send } from 'lucide-react';
import { daysUntilDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function StudentApplicationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: applications, error: applicationsError } = await service
    .from('applications')
    .select(`
      id, status, match_score, cover_note, created_at,
      internships(id, title, deadline, location_city, work_mode, duration_weeks,
        companies(name, status)
      ),
      application_events(from_status, to_status, note, created_at)
    `)
    .eq('student_id', user.id)
    .order('created_at', { ascending: false });
  if (applicationsError) {
    throw new Error(`Could not load your applications: ${applicationsError.message}`);
  }

  const active = applications.filter((a) =>
    !['withdrawn', 'rejected'].includes(a.status)
  );
  const closed = applications.filter((a) =>
    ['withdrawn', 'rejected'].includes(a.status)
  );

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Applications</h1>
          <p className="text-gray-500 mt-1">
            {applications.length} application{applications.length !== 1 ? 's' : ''} total
          </p>
        </div>

        {/* Active applications */}
        {active.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Active ({active.length})
            </h2>
            {active.map((app) => (
              <ApplicationCard key={app.id} application={app} locale={locale} />
            ))}
          </div>
        )}

        {/* Closed */}
        {closed.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide">
              Closed ({closed.length})
            </h2>
            {closed.map((app) => (
              <ApplicationCard key={app.id} application={app} locale={locale} />
            ))}
          </div>
        )}

        {!applications.length && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-14 text-center">
              <Send className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">No applications yet</p>
              <p className="text-sm text-gray-400 mt-1">Browse internships and start applying.</p>
              <Link
                href={`/${locale}/internships`}
                className="mt-4 inline-block text-sm text-indigo-600 hover:underline font-medium"
              >
                Browse Internships →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function ApplicationCard({ application, locale }: { application: any; locale: string }) {
  const internship = Array.isArray(application.internships)
    ? application.internships[0]
    : application.internships;
  const company = internship
    ? (Array.isArray(internship.companies) ? internship.companies[0] : internship.companies)
    : null;

  const events = (application.application_events ?? []).sort(
    (a: { created_at: string }, b: { created_at: string }) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const isActive = !['withdrawn', 'rejected'].includes(application.status);
  const nextStep = application.status === 'offered'
    ? { text: 'An offer is waiting for your response.', href: `/${locale}/student/placement`, label: 'Review offer' }
    : application.status === 'interview_scheduled'
      ? { text: 'Review the time and joining details for your interview.', href: `/${locale}/student/interviews`, label: 'View interview' }
      : application.status === 'accepted'
        ? { text: 'Your offer is accepted. Follow placement approval and updates here.', href: `/${locale}/student/placement`, label: 'View placement' }
        : application.status === 'shortlisted'
          ? { text: 'You are shortlisted. Watch for an interview invitation or offer.', href: `/${locale}/student/applications/${application.id}`, label: 'View application' }
          : application.status === 'rejected' || application.status === 'withdrawn'
            ? { text: 'This application is closed. Explore other opportunities.', href: `/${locale}/internships`, label: 'Find internships' }
            : { text: 'Your application is in review. We will show updates here.', href: `/${locale}/student/applications/${application.id}`, label: 'View timeline' };
  const deadlineDays = internship?.deadline ? daysUntilDate(internship.deadline) : null;

  return (
    <Card className="border-0 shadow-sm">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          {/* Left: company + role */}
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
            <div className="min-w-0">
              <Link
                href={`/${locale}/internships/${internship?.id}`}
                className="font-semibold text-gray-900 hover:text-indigo-600 text-sm"
              >
                {internship?.title ?? 'Unknown'}
              </Link>
              <p className="text-xs text-gray-500">{company?.name ?? '—'}</p>
              <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                {internship?.location_city && (
                  <span>{internship.location_city}</span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {internship?.duration_weeks} weeks
                </span>
                {internship?.deadline && (
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Due {new Date(internship.deadline).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: status + score + withdraw */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            <StatusBadge status={application.status} />
            {application.match_score != null && (
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                application.match_score >= 70 ? 'bg-green-100 text-green-700' :
                application.match_score >= 40 ? 'bg-amber-100 text-amber-700' :
                'bg-gray-100 text-gray-500'
              }`}>
                {application.match_score}% match
              </span>
            )}
            {isActive && application.status !== 'accepted' && (
              <WithdrawButton applicationId={application.id} />
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          <p className="text-xs text-gray-600">{nextStep.text}</p>
          <Link href={nextStep.href} className="text-xs font-medium text-indigo-600 hover:underline">
            {nextStep.label} →
          </Link>
        </div>
        {isActive && deadlineDays !== null && deadlineDays >= 0 && deadlineDays <= 7 && (
          <p className="mt-2 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
            The internship listing closes {deadlineDays === 0 ? 'today' : `in ${deadlineDays} day${deadlineDays === 1 ? '' : 's'}`}. Your submitted application remains in your application timeline.
          </p>
        )}

        {/* Timeline — last 3 events */}
        {events.length > 0 && (
          <div className="mt-3 space-y-1 border-t pt-3">
            {events.slice(0, 3).map((ev: {
              to_status: string; note?: string; created_at: string;
            }, i: number) => (
              <div key={i} className="flex items-start gap-2 text-xs text-gray-500">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-300 mt-1.5 shrink-0" />
                <span>
                  <span className="font-medium text-gray-700 capitalize">
                    {ev.to_status.replace(/_/g, ' ')}
                  </span>
                  {ev.note && ` — ${ev.note}`}
                  <span className="ml-1 text-gray-400">
                    · {new Date(ev.created_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                  </span>
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
