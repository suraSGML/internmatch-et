import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LogbookEntryForm } from './LogbookEntryForm';
import { BookOpen, Clock, CheckCircle2, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentLogbookPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // Get active placement
  const { data: placement } = await supabase
    .from('placements')
    .select('id, start_date, end_date, companies(name)')
    .eq('student_id', user.id)
    .eq('status', 'active')
    .single();

  // Get existing logbook entries
  const { data: entries } = placement
    ? await supabase
        .from('logbook_entries')
        .select('id, week_start, week_end, tasks, skills_practiced, challenges, hours, status, supervisor_comment, approved_at')
        .eq('placement_id', placement.id)
        .order('week_start', { ascending: false })
    : { data: [] };

  // Compute summary stats
  const approved = (entries ?? []).filter((e) => e.status === 'approved');
  const totalHours = approved.reduce((sum, e) => sum + Number(e.hours), 0);
  const approvalRate = entries?.length
    ? Math.round((approved.length / entries.length) * 100)
    : 0;

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Logbook</h1>
          <p className="text-gray-500 mt-1">
            {placement
              ? `Internship at ${(Array.isArray(placement.companies) ? placement.companies[0] : placement.companies as { name?: string } | null)?.name ?? 'Company'}`
              : 'No active placement'}
          </p>
        </div>

        {!placement ? (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center text-gray-400">
              <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No active placement. Your logbook will appear here once you start your internship.</p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Entries', value: entries?.length ?? 0, icon: BookOpen, color: 'text-indigo-600' },
                { label: 'Approved Hours', value: `${totalHours}h`, icon: Clock, color: 'text-green-600' },
                { label: 'Approval Rate', value: `${approvalRate}%`, icon: CheckCircle2, color: approvalRate >= 70 ? 'text-green-600' : 'text-amber-600' },
              ].map(({ label, value, icon: Icon, color }) => (
                <Card key={label} className="border-0 shadow-sm">
                  <CardContent className="pt-3 pb-3 text-center">
                    <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
                    <p className={`text-xl font-bold ${color}`}>{value}</p>
                    <p className="text-xs text-gray-500">{label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* New entry form */}
            <LogbookEntryForm placementId={placement.id} />

            {/* Past entries */}
            {(entries ?? []).length > 0 && (
              <div className="space-y-3">
                <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                  Past Entries ({entries!.length})
                </h2>
                {entries!.map((entry) => (
                  <Card key={entry.id} className="border-0 shadow-sm">
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5 text-gray-400" />
                              Week of {new Date(entry.week_start).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                            <span className="text-xs text-gray-400 flex items-center gap-1">
                              <Clock className="h-3 w-3" />{entry.hours}h
                            </span>
                          </div>
                          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{entry.tasks}</p>
                          {entry.supervisor_comment && (
                            <div className="mt-2 bg-indigo-50 rounded-lg p-2">
                              <p className="text-xs text-indigo-700 font-medium">Supervisor note:</p>
                              <p className="text-xs text-indigo-600">{entry.supervisor_comment}</p>
                            </div>
                          )}
                        </div>
                        <StatusBadge status={entry.status} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
