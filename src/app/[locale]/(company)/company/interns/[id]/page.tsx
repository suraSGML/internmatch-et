import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LogbookReviewPanel } from './LogbookReviewPanel';
import { EvaluationForm } from './EvaluationForm';
import { IssueCertificateButton } from './IssueCertificateButton';
import { ArrowLeft, User, Calendar, Clock, Star } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function InternDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params; // id is placement_id
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (!membership) redirect(`/${locale}/onboarding`);

  // The verified company scope avoids recursive application RLS evaluation on this join.
  const service = createServiceClient();
  const { data: placement } = await service
    .from('placements')
    .select(`
      id, student_id, start_date, end_date, status, company_id,
      profiles!placements_student_id_fkey(full_name, phone, city),
      applications(internships(title)),
      companies(name)
    `)
    .eq('id', id)
    .eq('company_id', membership.company_id)
    .maybeSingle();

  if (!placement) notFound();

  const { data: sp } = await service
    .from('student_profiles')
    .select('skills, bio, year_of_study, universities(name), departments(name)')
    .eq('user_id', placement.student_id)
    .maybeSingle();

  const [{ data: entries }, { data: evaluations }, { data: certificate }] = await Promise.all([
    supabase
      .from('logbook_entries')
      .select('id, week_start, week_end, tasks, skills_practiced, challenges, hours, status, supervisor_comment')
      .eq('placement_id', id)
      .order('week_start', { ascending: false }),
    supabase
      .from('evaluations')
      .select('id, type, ratings, comments, recommendation, visible_to_student, submitted_at')
      .eq('placement_id', id),
    supabase
      .from('certificates')
      .select('id, public_code, issued_at')
      .eq('placement_id', id)
      .is('revoked_at', null)
      .single(),
  ]);

  const profile = Array.isArray(placement.profiles) ? placement.profiles[0] : placement.profiles as { full_name?: string; phone?: string; city?: string } | null;
  const app = Array.isArray(placement.applications) ? placement.applications[0] : placement.applications as Record<string, unknown> | null;
  const internship = app ? (Array.isArray((app as Record<string, unknown>).internships) ? ((app as Record<string, unknown>).internships as Array<{ title?: string }>)[0] : (app as Record<string, unknown>).internships as { title?: string } | null) : null;
  const uni = sp ? (Array.isArray((sp as Record<string, unknown>).universities) ? ((sp as Record<string, unknown>).universities as Array<{ name?: string }>)[0] : (sp as Record<string, unknown>).universities as { name?: string } | null) : null;
  const dept = sp ? (Array.isArray((sp as Record<string, unknown>).departments) ? ((sp as Record<string, unknown>).departments as Array<{ name?: string }>)[0] : (sp as Record<string, unknown>).departments as { name?: string } | null) : null;

  const approvedHours = (entries ?? [])
    .filter((e) => e.status === 'approved')
    .reduce((sum, e) => sum + Number(e.hours), 0);

  const hasFinalEval = (evaluations ?? []).some((e) => e.type === 'final');
  const canIssueCertificate = placement.status === 'completed' && hasFinalEval;

  return (
    <DashboardLayout locale={locale}>
      <div className="max-w-3xl mx-auto space-y-5">
        <Link href={`/${locale}/company/interns`} className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600">
          <ArrowLeft className="h-4 w-4" /> Back to interns
        </Link>

        {/* Intern header */}
        <Card className="border-0 shadow-sm">
          <CardContent className="pt-4 pb-4">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center shrink-0">
                  <User className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{(profile as { full_name?: string } | null)?.full_name ?? '—'}</p>
                  <p className="text-sm text-indigo-600">{(internship as { title?: string } | null)?.title ?? '—'}</p>
                  <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                    {(uni as { name?: string } | null)?.name && <span>{(uni as { name: string }).name}</span>}
                    {(dept as { name?: string } | null)?.name && <span>{(dept as { name: string }).name}</span>}
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {new Date(placement.start_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                      {placement.end_date && ` – ${new Date(placement.end_date).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}`}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />{approvedHours}h approved
                    </span>
                  </div>
                </div>
              </div>
              <StatusBadge status={placement.status} />
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="logbook">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="logbook">Logbook ({entries?.length ?? 0})</TabsTrigger>
            <TabsTrigger value="evaluations">Evaluations</TabsTrigger>
            <TabsTrigger value="certificate">Certificate</TabsTrigger>
          </TabsList>

          {/* Logbook */}
          <TabsContent value="logbook">
            <LogbookReviewPanel entries={entries ?? []} />
          </TabsContent>

          {/* Evaluations */}
          <TabsContent value="evaluations">
            <div className="space-y-4 pt-2">
              {/* Existing evaluations */}
              {(evaluations ?? []).map((ev) => (
                <Card key={ev.id} className="border-0 shadow-sm">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span className="capitalize">{ev.type} Evaluation</span>
                      <span className="text-xs text-gray-400 font-normal">
                        {new Date(ev.submitted_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4 space-y-2">
                    {Object.entries(ev.ratings as Record<string, number>).map(([key, val]) => (
                      <div key={key} className="flex items-center justify-between text-sm">
                        <span className="text-gray-600 capitalize">{key.replace(/_/g, ' ')}</span>
                        <div className="flex gap-0.5">
                          {[1,2,3,4,5].map((n) => (
                            <Star key={n} className={`h-3.5 w-3.5 ${n <= val ? 'text-amber-400 fill-amber-400' : 'text-gray-200'}`} />
                          ))}
                        </div>
                      </div>
                    ))}
                    {ev.comments && <p className="text-sm text-gray-600 mt-2 pt-2 border-t">{ev.comments}</p>}
                    {ev.recommendation && <p className="text-sm text-indigo-600 italic">&quot;{ev.recommendation}&quot;</p>}
                  </CardContent>
                </Card>
              ))}

              {/* Evaluation form */}
              <EvaluationForm
                placementId={id}
                existingTypes={(evaluations ?? []).map((e) => e.type)}
              />
            </div>
          </TabsContent>

          {/* Certificate */}
          <TabsContent value="certificate">
            <Card className="border-0 shadow-sm mt-2">
              <CardContent className="pt-5 pb-5 space-y-4">
                {certificate ? (
                  <div className="text-center space-y-3">
                    <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
                      <Star className="h-7 w-7 text-amber-500 fill-amber-500" />
                    </div>
                    <p className="font-semibold text-gray-900">Certificate Issued</p>
                    <code className="text-sm font-mono bg-gray-100 px-3 py-1.5 rounded-lg block">
                      {certificate.public_code}
                    </code>
                    <Link
                      href={`/${locale}/verify/${certificate.public_code}`}
                      target="_blank"
                      className="text-sm text-indigo-600 hover:underline"
                    >
                      View verification page →
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-gray-600">
                      After the placement is marked completed and the final evaluation is submitted, issue a completion certificate.
                      The certificate includes the intern&apos;s name, role, company, duration, and total approved hours.
                    </p>
                    {placement.status !== 'completed' && (
                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
                        Certificate issuance becomes available after the university coordinator marks this placement completed.
                      </div>
                    )}
                    {!hasFinalEval && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
                        Complete the final evaluation before issuing a certificate.
                      </div>
                    )}
                    <IssueCertificateButton
                      placementId={id}
                      disabled={!canIssueCertificate}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
