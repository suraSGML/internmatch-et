import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { PlacementApprovalButtons } from './PlacementApprovalButtons';
import { GraduationCap, Calendar, MapPin } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UniversityPlacementsPage({
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
    .select('university_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) throw new Error(`Could not load coordinator university: ${membershipError.message}`);
  if (!membership) redirect(`/${locale}/university/settings`);

  const { data: placements, error: placementsError } = await service
    .from('placements')
    .select(`
      id, start_date, end_date, status, rejection_reason,
      profiles!placements_student_id_fkey(full_name),
      companies(name, city),
      applications(internships(title))
    `)
    .eq('university_id', membership.university_id)
    .order('created_at', { ascending: false });
  if (placementsError) throw new Error(`Could not load placements: ${placementsError.message}`);

  const pending = (placements ?? []).filter((p) => p.status === 'pending_approval');
  const active = (placements ?? []).filter((p) => ['approved', 'active'].includes(p.status));
  const closed = (placements ?? []).filter((p) => ['completed', 'rejected', 'terminated'].includes(p.status));
  const todayInAddis = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Addis_Ababa',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const renderPlacement = (p: NonNullable<typeof placements>[number]) => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles as { full_name?: string } | null;
    const company = Array.isArray(p.companies) ? p.companies[0] : p.companies as { name?: string; city?: string } | null;
    const app = Array.isArray(p.applications) ? p.applications[0] : p.applications as Record<string, unknown> | null;
    const internship = app
      ? (Array.isArray((app as Record<string, unknown>).internships)
          ? ((app as Record<string, unknown>).internships as Array<{ title?: string }>)[0]
          : (app as Record<string, unknown>).internships as { title?: string } | null)
      : null;

    return (
      <Card key={p.id} className="border-0 shadow-sm">
        <CardContent className="pt-4 pb-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                <GraduationCap className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">
                  {(profile as { full_name?: string } | null)?.full_name ?? '—'}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {(internship as { title?: string } | null)?.title ?? '—'} at{' '}
                  <span className="font-medium">{(company as { name?: string } | null)?.name ?? '—'}</span>
                </p>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                  {(company as { city?: string } | null)?.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{(company as { city: string }).city}
                    </span>
                  )}
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(p.start_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })}
                    {p.end_date && ` – ${new Date(p.end_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}`}
                  </span>
                </div>
                {p.rejection_reason && (
                  <p className="text-xs text-red-500 mt-1">Reason: {p.rejection_reason}</p>
                )}
              </div>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={p.status} />
              {(
                p.status === 'pending_approval' ||
                (p.status === 'approved' && p.start_date <= todayInAddis) ||
                (p.status === 'active' && (!p.end_date || p.end_date <= todayInAddis))
              ) && (
                <PlacementApprovalButtons placementId={p.id} status={p.status} />
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placements</h1>
          <p className="text-gray-500 mt-1">
            {pending.length} pending · {active.length} active · {closed.length} closed
          </p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Pending Approval', count: pending.length, color: 'text-amber-600' },
            { label: 'Active / Approved', count: active.length, color: 'text-green-600' },
            { label: 'Closed', count: closed.length, color: 'text-gray-400' },
          ].map(({ label, count, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="pt-3 pb-3 text-center">
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {pending.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
              Awaiting Approval ({pending.length})
            </h2>
            <div className="space-y-3">{pending.map(renderPlacement)}</div>
          </section>
        )}

        {active.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3">
              Active ({active.length})
            </h2>
            <div className="space-y-3">{active.map(renderPlacement)}</div>
          </section>
        )}

        {closed.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">
              Closed ({closed.length})
            </h2>
            <div className="space-y-3">{closed.map(renderPlacement)}</div>
          </section>
        )}

        {!placements?.length && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center text-gray-400 text-sm">
              No placements yet.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
