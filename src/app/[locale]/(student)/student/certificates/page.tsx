import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Award, ExternalLink, ShieldCheck, Calendar } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentCertificatesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  // Certificates
  const { data: certificates } = await supabase
    .from('certificates')
    .select(`
      id, public_code, issued_at, revoked_at, data,
      placements(
        companies(name),
        applications(internships(title))
      )
    `)
    .eq('placements.student_id', user.id)
    .order('issued_at', { ascending: false });

  // Placement letters
  const { data: letters } = await supabase
    .from('placement_letters')
    .select(`
      id, public_code, issued_at, revoked_at,
      placements!inner(
        student_id,
        companies(name),
        applications(internships(title))
      )
    `)
    .eq('placements.student_id', user.id)
    .order('issued_at', { ascending: false });

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Certificates</h1>
          <p className="text-gray-500 mt-1">Your verified completion certificates and placement letters.</p>
        </div>

        {/* Completion Certificates */}
        <section>
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Completion Certificates ({(certificates ?? []).filter((c) => !c.revoked_at).length})
          </h2>
          {(certificates ?? []).length > 0 ? (
            <div className="space-y-3">
              {certificates!.map((cert) => {
                const placement = Array.isArray(cert.placements) ? cert.placements[0] : cert.placements as Record<string, unknown> | null;
                const company = placement
                  ? (Array.isArray((placement as Record<string, unknown>).companies)
                      ? ((placement as Record<string, unknown>).companies as Array<{ name?: string }>)[0]
                      : (placement as Record<string, unknown>).companies as { name?: string } | null)
                  : null;
                const app = placement
                  ? (Array.isArray((placement as Record<string, unknown>).applications)
                      ? ((placement as Record<string, unknown>).applications as Array<Record<string, unknown>>)[0]
                      : (placement as Record<string, unknown>).applications as Record<string, unknown> | null)
                  : null;
                const internship = app
                  ? (Array.isArray((app as Record<string, unknown>).internships)
                      ? ((app as Record<string, unknown>).internships as Array<{ title?: string }>)[0]
                      : (app as Record<string, unknown>).internships as { title?: string } | null)
                  : null;
                const certData = cert.data as { total_hours?: number } | null;

                return (
                  <Card key={cert.id} className={`border-0 shadow-sm ${cert.revoked_at ? 'opacity-60' : ''}`}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
                            <Award className="h-5 w-5 text-amber-600" />
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900">
                              {(internship as { title?: string } | null)?.title ?? 'Internship'}
                            </p>
                            <p className="text-sm text-gray-500">{(company as { name?: string } | null)?.name}</p>
                            <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {new Date(cert.issued_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                              {certData?.total_hours && (
                                <span>{certData.total_hours}h completed</span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 mt-1.5">
                              <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                                {cert.public_code}
                              </code>
                              <Link
                                href={`/${locale}/verify/${cert.public_code}`}
                                target="_blank"
                                className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
                              >
                                Verify <ExternalLink className="h-2.5 w-2.5" />
                              </Link>
                            </div>
                          </div>
                        </div>
                        {cert.revoked_at ? (
                          <Badge variant="outline" className="text-red-500 border-red-200">Revoked</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-700 hover:bg-green-100 gap-1">
                            <ShieldCheck className="h-3 w-3" /> Valid
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-8 text-center text-gray-400 text-sm">
                No certificates yet. Complete your internship to receive one.
              </CardContent>
            </Card>
          )}
        </section>

        {/* Placement Letters */}
        {(letters ?? []).length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
              Placement Letters ({letters!.length})
            </h2>
            <div className="space-y-3">
              {letters!.map((letter) => {
                const placement = Array.isArray(letter.placements) ? letter.placements[0] : letter.placements as Record<string, unknown> | null;
                const company = placement
                  ? (Array.isArray((placement as Record<string, unknown>).companies)
                      ? ((placement as Record<string, unknown>).companies as Array<{ name?: string }>)[0]
                      : (placement as Record<string, unknown>).companies as { name?: string } | null)
                  : null;

                return (
                  <Card key={letter.id} className="border-0 shadow-sm">
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-center justify-between gap-3 flex-wrap">
                        <div>
                          <p className="font-medium text-sm text-gray-900">
                            Placement Letter — {(company as { name?: string } | null)?.name}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded font-mono">
                              {letter.public_code}
                            </code>
                            <Link
                              href={`/${locale}/verify/${letter.public_code}`}
                              target="_blank"
                              className="text-xs text-indigo-600 hover:underline flex items-center gap-0.5"
                            >
                              Verify <ExternalLink className="h-2.5 w-2.5" />
                            </Link>
                          </div>
                        </div>
                        {letter.revoked_at ? (
                          <Badge variant="outline" className="text-red-500 border-red-200">Revoked</Badge>
                        ) : (
                          <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 gap-1">
                            <ShieldCheck className="h-3 w-3" /> Valid
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
