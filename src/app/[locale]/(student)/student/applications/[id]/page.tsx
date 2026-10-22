import { createClient } from '@/lib/supabase/server';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { MessageThread } from '@/components/shared/MessageThread';
import { ArrowLeft, Calendar, Building2, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function ApplicationDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: application } = await supabase
    .from('applications')
    .select(`
      id, status, cover_note, match_score, created_at,
      internships(id, title, deadline, duration_weeks, location_city, work_mode,
        companies(name)
      ),
      application_events(from_status, to_status, note, created_at)
    `)
    .eq('id', id)
    .eq('student_id', user.id)
    .single();

  if (!application) notFound();

  const { data: messages } = await supabase
    .from('messages')
    .select('id, body, sender_id, created_at')
    .eq('application_id', id)
    .order('created_at', { ascending: true });

  const internship = Array.isArray(application.internships)
    ? application.internships[0]
    : application.internships as Record<string, unknown> | null;
  const company = internship
    ? (Array.isArray((internship as Record<string, unknown>).companies)
        ? ((internship as Record<string, unknown>).companies as Array<{ name?: string }>)[0]
        : (internship as Record<string, unknown>).companies as { name?: string } | null)
    : null;

  const events = ((application.application_events as Array<{
    from_status: string; to_status: string; note?: string; created_at: string;
  }>) ?? []).sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  return (
    <DashboardLayout locale={locale}>
      <div className="max-w-2xl mx-auto space-y-5">
        <Link
          href={`/${locale}/student/applications`}
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600"
        >
          <ArrowLeft className="h-4 w-4" /> Back to applications
        </Link>

        {/* Header */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                  <Building2 className="h-5 w-5 text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">
                    {(internship as { title?: string } | null)?.title ?? '—'}
                  </p>
                  <p className="text-sm text-indigo-600">{(company as { name?: string } | null)?.name}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    {(internship as { duration_weeks?: number } | null)?.duration_weeks && (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {(internship as { duration_weeks: number }).duration_weeks} weeks
                      </span>
                    )}
                    {(internship as { deadline?: string } | null)?.deadline && (
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        Due {new Date((internship as { deadline: string }).deadline).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
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
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Status timeline */}
        {events.length > 0 && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Application Timeline</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <div className="relative pl-4 space-y-4">
                <div className="absolute left-1.5 top-0 bottom-0 w-px bg-gray-200" />
                {events.map((ev, i) => (
                  <div key={i} className="relative flex items-start gap-3">
                    <span className="absolute -left-1 top-1.5 h-2.5 w-2.5 rounded-full border-2 border-white bg-indigo-400 shrink-0" />
                    <div className="pl-3">
                      <p className="text-sm font-medium text-gray-800 capitalize">
                        {ev.to_status.replace(/_/g, ' ')}
                      </p>
                      {ev.note && (
                        <p className="text-xs text-gray-500 mt-0.5">{ev.note}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-0.5">
                        {new Date(ev.created_at).toLocaleDateString('en-ET', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Cover note */}
        {application.cover_note && (
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold text-gray-700">Your Cover Note</CardTitle>
            </CardHeader>
            <CardContent className="pb-4">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{application.cover_note}</p>
            </CardContent>
          </Card>
        )}

        {/* Messages */}
        <Card className="border-0 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold text-gray-700">Messages</CardTitle>
          </CardHeader>
          <CardContent className="pb-4">
            <MessageThread
              applicationId={id}
              currentUserId={user.id}
              messages={(messages ?? []).map((m) => ({
                id: m.id,
                body: m.body,
                sender_id: m.sender_id,
                created_at: m.created_at,
                is_mine: m.sender_id === user.id,
              }))}
            />
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
