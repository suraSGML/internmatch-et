import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { OfferResponseButtons } from './OfferResponseButtons';
import {
  Building2, Calendar, MapPin, Clock, CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentPlacementPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: placement, error: placementError } = await service
    .from('placements')
    .select(`
      id, start_date, end_date, status, rejection_reason,
      companies(name, city, website),
      universities(name),
      applications(internships(title))
    `)
    .eq('student_id', user.id)
    .in('status', ['pending_approval', 'approved', 'active', 'completed', 'rejected', 'terminated'])
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (placementError) throw new Error(`Could not load your placement: ${placementError.message}`);

  // Pending offers
  const { data: offers, error: offersError } = await service
    .from('offers')
    .select(`
      id, start_date, end_date, terms, status, created_at,
      applications!inner(
        id, student_id,
        internships(title, companies(name))
      )
    `)
    .eq('applications.student_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (offersError) throw new Error(`Could not load your offers: ${offersError.message}`);

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Placement</h1>
          <p className="text-gray-500 mt-1">Your internship placement status.</p>
        </div>

        {/* Pending offers */}
        {(offers ?? []).length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-amber-700 uppercase tracking-wide flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              Pending Offers ({offers!.length})
            </h2>
            {offers!.map((offer) => {
              const app = Array.isArray(offer.applications) ? offer.applications[0] : offer.applications as Record<string, unknown>;
              const internship = app ? (Array.isArray((app as Record<string, unknown>).internships)
                ? ((app as Record<string, unknown>).internships as Array<{ title?: string }>)[0]
                : (app as Record<string, unknown>).internships as { title?: string } | null) : null;
              const internshipAny = internship as Record<string, unknown> | null;
              const comp = internshipAny?.companies ? (Array.isArray(internshipAny.companies) ? (internshipAny.companies as Array<{ name?: string }>)[0] : internshipAny.companies as { name?: string }) : null;

              return (
                <Card key={offer.id} className="border-0 shadow-sm border-l-4 border-l-amber-400">
                  <CardContent className="pt-4 pb-4 space-y-3">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {(internshipAny as Record<string, unknown> | null)?.title as string ?? 'Internship Offer'}
                        </p>
                        <p className="text-sm text-gray-500">{comp?.name}</p>
                        <div className="flex gap-4 mt-2 text-sm text-gray-600">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4 text-gray-400" />
                            Start: {new Date(offer.start_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                          {offer.end_date && (
                            <span className="flex items-center gap-1">
                              <Clock className="h-4 w-4 text-gray-400" />
                              End: {new Date(offer.end_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'long', year: 'numeric' })}
                            </span>
                          )}
                        </div>
                        {offer.terms && (
                          <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded p-2">
                            {offer.terms}
                          </p>
                        )}
                      </div>
                      <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100">
                        Offer Pending
                      </Badge>
                    </div>
                    <OfferResponseButtons offerId={offer.id} />
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Active placement */}
        {placement ? (
          <div className="space-y-4">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Current Placement
            </h2>
            <Card className="border-0 shadow-sm">
              <CardContent className="pt-5 pb-5 space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div className="flex items-start gap-3">
                    <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      {(() => {
                        const appRaw = Array.isArray(placement.applications) ? placement.applications[0] : placement.applications as Record<string, unknown> | null;
                        const internshipRaw = appRaw ? (Array.isArray((appRaw as Record<string, unknown>).internships)
                          ? ((appRaw as Record<string, unknown>).internships as Array<{ title?: string }>)[0]
                          : (appRaw as Record<string, unknown>).internships as { title?: string } | null) : null;
                        const companyRaw2 = Array.isArray(placement.companies) ? placement.companies[0] : placement.companies as Record<string, unknown> | null;
                        const uniRaw = Array.isArray(placement.universities) ? placement.universities[0] : placement.universities as { name?: string } | null;
                        return (
                          <>
                            <p className="font-bold text-gray-900 text-lg">
                              {(internshipRaw as { title?: string } | null)?.title ?? 'Internship'}
                            </p>
                            <p className="text-indigo-600 font-medium">
                              {(companyRaw2 as { name?: string } | null)?.name}
                            </p>
                            {(companyRaw2 as { city?: string } | null)?.city && (
                              <p className="text-sm text-gray-500 flex items-center gap-1 mt-0.5">
                                <MapPin className="h-3.5 w-3.5" />
                                {(companyRaw2 as { city: string }).city}
                              </p>
                            )}
                            {(uniRaw as { name?: string } | null)?.name && (
                              <p className="text-xs text-purple-600 mt-1">
                                🎓 Approved by {(uniRaw as { name: string }).name}
                              </p>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </div>
                  <StatusBadge status={placement.status} />
                </div>
                <p className="text-sm text-gray-600">
                  {placement.status === 'pending_approval' &&
                    'Your offer is accepted. Your university coordinator must approve this placement before it can begin.'}
                  {placement.status === 'approved' &&
                    'Your university approved this placement. It will be marked active when your coordinator confirms that it has started.'}
                  {placement.status === 'active' &&
                    'Your placement is active. Submit your weekly logbook entries while you are working.'}
                  {placement.status === 'completed' &&
                    'Your placement has been completed.'}
                  {placement.status === 'rejected' &&
                    'Your university coordinator did not approve this placement.'}
                  {placement.status === 'terminated' &&
                    'This placement has been terminated. Contact your university coordinator if you have questions.'}
                </p>
                {placement.status === 'rejected' && placement.rejection_reason && (
                  <p className="rounded-md bg-red-50 p-3 text-sm text-red-700">
                    Coordinator’s reason: {placement.rejection_reason}
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">Start Date</p>
                    <p className="text-sm font-medium">
                      {new Date(placement.start_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  {placement.end_date && (
                    <div>
                      <p className="text-xs text-gray-400 mb-0.5">End Date</p>
                      <p className="text-sm font-medium">
                        {new Date(placement.end_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  )}
                </div>

                {placement.status === 'active' && (
                  <div className="flex gap-3 pt-1">
                    <Link
                      href={`/${locale}/student/logbook`}
                      className="text-sm text-indigo-600 hover:underline font-medium"
                    >
                      📓 Open Logbook →
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          !offers?.length && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-12 text-center text-gray-400">
                <CheckCircle2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No active placement</p>
                <p className="text-sm mt-1">
                  Apply to internships and accept an offer to get placed.
                </p>
                <Link
                  href={`/${locale}/internships`}
                  className="mt-4 inline-block text-sm text-indigo-600 hover:underline font-medium"
                >
                  Browse Internships →
                </Link>
              </CardContent>
            </Card>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
