import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { BookOpen, Calendar, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UniversityLogbooksPage({
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

  // Recent logbook entries from this university's students
  const { data: entries } = await supabase
    .from('logbook_entries')
    .select(`
      id, week_start, week_end, tasks, hours, status, created_at,
      placements!inner(
        university_id,
        profiles!placements_student_id_fkey(full_name),
        companies(name)
      )
    `)
    .eq('placements.university_id', membership.university_id)
    .order('created_at', { ascending: false })
    .limit(50);

  const pending = (entries ?? []).filter((e) => e.status === 'submitted');
  const approved = (entries ?? []).filter((e) => e.status === 'approved');
  const others = (entries ?? []).filter((e) => !['submitted', 'approved'].includes(e.status));

  const renderEntry = (entry: NonNullable<typeof entries>[number]) => {
    const placement = Array.isArray(entry.placements) ? entry.placements[0] : entry.placements as Record<string, unknown> | null;
    const profile = placement
      ? (Array.isArray((placement as Record<string, unknown>).profiles)
          ? ((placement as Record<string, unknown>).profiles as Array<{ full_name?: string }>)[0]
          : (placement as Record<string, unknown>).profiles as { full_name?: string } | null)
      : null;
    const company = placement
      ? (Array.isArray((placement as Record<string, unknown>).companies)
          ? ((placement as Record<string, unknown>).companies as Array<{ name?: string }>)[0]
          : (placement as Record<string, unknown>).companies as { name?: string } | null)
      : null;

    return (
      <Card key={entry.id} className="border-0 shadow-sm">
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <p className="font-medium text-sm text-gray-900">
                {(profile as { full_name?: string } | null)?.full_name ?? '—'}
              </p>
              <p className="text-xs text-gray-500">
                {(company as { name?: string } | null)?.name ?? '—'}
              </p>
              <div className="flex gap-3 mt-1 text-xs text-gray-400">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Week of {new Date(entry.week_start).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {entry.hours}h
                </span>
              </div>
              {entry.tasks && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-1">{entry.tasks}</p>
              )}
            </div>
            <StatusBadge status={entry.status} />
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logbooks</h1>
          <p className="text-gray-500 mt-1">
            Recent logbook entries from your university's interns.
          </p>
        </div>

        {pending.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-3">
              Submitted — Awaiting Supervisor Review ({pending.length})
            </h2>
            <div className="space-y-2">{pending.map(renderEntry)}</div>
          </section>
        )}

        {approved.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3">
              Approved ({approved.length})
            </h2>
            <div className="space-y-2">{approved.map(renderEntry)}</div>
          </section>
        )}

        {others.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Other ({others.length})
            </h2>
            <div className="space-y-2">{others.map(renderEntry)}</div>
          </section>
        )}

        {!entries?.length && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center text-gray-400">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No logbook entries yet.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
