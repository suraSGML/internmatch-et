import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { IssuePlacementLetterButton } from './IssuePlacementLetterButton';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { FileText, Shield, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UniversityLettersPage({
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

  const { data: approvedPlacements, error: placementsError } = await service
    .from('placements')
    .select(`
      id, status,
      profiles!placements_student_id_fkey(full_name),
      companies(name),
      applications(internships(title)),
      placement_letters(id, public_code, issued_at, revoked_at)
    `)
    .eq('university_id', membership.university_id)
    .in('status', ['pending_approval', 'approved', 'active', 'completed'])
    .order('created_at', { ascending: false });
  if (placementsError) throw new Error(`Could not load university placements: ${placementsError.message}`);

  const awaitingApproval = (approvedPlacements ?? []).filter((placement) => placement.status === 'pending_approval');
  const eligiblePlacements = (approvedPlacements ?? []).filter((placement) => placement.status !== 'pending_approval');

  const withLetter = eligiblePlacements.filter(
    (p) => (Array.isArray(p.placement_letters) ? p.placement_letters : [p.placement_letters]).some(
      (l) => l && !(l as { revoked_at?: string | null }).revoked_at
    )
  );
  const withoutLetter = eligiblePlacements.filter(
    (p) => !(Array.isArray(p.placement_letters) ? p.placement_letters : [p.placement_letters]).some(
      (l) => l && !(l as { revoked_at?: string | null }).revoked_at
    )
  );

  const renderRow = (p: NonNullable<typeof approvedPlacements>[number], hasLetter: boolean) => {
    const profile = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles as { full_name?: string } | null;
    const company = Array.isArray(p.companies) ? p.companies[0] : p.companies as { name?: string } | null;
    const app = Array.isArray(p.applications) ? p.applications[0] : p.applications as Record<string, unknown> | null;
    const internship = app
      ? (Array.isArray((app as Record<string, unknown>).internships)
          ? ((app as Record<string, unknown>).internships as Array<{ title?: string }>)[0]
          : (app as Record<string, unknown>).internships as { title?: string } | null)
      : null;
    const letters = Array.isArray(p.placement_letters) ? p.placement_letters : [p.placement_letters];
    const activeLetter = letters.find((l) => l && !(l as { revoked_at?: string | null }).revoked_at) as { public_code?: string; issued_at?: string } | null;

    return (
      <Card key={p.id} className="border-0 shadow-sm">
        <CardContent className="pt-3 pb-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                <FileText className="h-4 w-4 text-indigo-600" />
              </div>
              <div>
                <p className="font-medium text-sm text-gray-900">
                  {(profile as { full_name?: string } | null)?.full_name ?? '—'}
                </p>
                <p className="text-xs text-gray-500">
                  {(internship as { title?: string } | null)?.title ?? '—'} at{' '}
                  {(company as { name?: string } | null)?.name ?? '—'}
                </p>
                <div className="mt-1">
                  <StatusBadge status={p.status} />
                </div>
                {activeLetter && (
                  <div className="flex items-center gap-2 mt-1">
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                      {activeLetter.public_code}
                    </code>
                    <a
                      href={`/${locale}/verify/${activeLetter.public_code}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
                    >
                      Verify <ExternalLink className="h-2.5 w-2.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {hasLetter ? (
                <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                  <Shield className="h-3 w-3" /> Letter Issued
                </Badge>
              ) : p.status === 'pending_approval' ? (
                <Badge variant="outline" className="text-amber-700">Awaiting coordinator approval</Badge>
              ) : (
                <IssuePlacementLetterButton placementId={p.id} />
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
          <h1 className="text-2xl font-bold text-gray-900">Placement Letters</h1>
          <p className="text-gray-500 mt-1">
            Issue verifiable placement letters for approved students.
          </p>
        </div>

        {awaitingApproval.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
              Awaiting Placement Approval ({awaitingApproval.length})
            </h2>
            <div className="space-y-2">
              {awaitingApproval.map((placement) => renderRow(placement, false))}
            </div>
          </section>
        )}

        {withoutLetter.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">
              Pending Letter ({withoutLetter.length})
            </h2>
            <div className="space-y-2">{withoutLetter.map((p) => renderRow(p, false))}</div>
          </section>
        )}

        {withLetter.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3">
              Letters Issued ({withLetter.length})
            </h2>
            <div className="space-y-2">{withLetter.map((p) => renderRow(p, true))}</div>
          </section>
        )}

        {!approvedPlacements?.length && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center text-gray-400 text-sm">
              No approved placements yet. Approve placements before issuing letters.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
