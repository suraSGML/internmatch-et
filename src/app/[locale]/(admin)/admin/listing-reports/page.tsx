import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListingReportReview } from './ListingReportReview';
import { Flag } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminListingReportsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) throw new Error(`Could not verify administrator access: ${profileError.message}`);
  if (profile?.role !== 'admin') redirect(`/${locale}/unauthorized`);

  const { data: reports, error } = await supabase
    .from('listing_reports')
    .select(`
      id, reason, status, admin_note, created_at, reviewed_at,
      internships(id, title, status, companies(name)),
      profiles!listing_reports_reporter_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load listing reports: ${error.message}`);

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-5">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Listing reports</h1>
          <p className="mt-1 text-sm text-gray-500">Review student reports about inaccurate, misleading, or suspicious internship listings.</p>
        </header>
        {reports?.length ? reports.map((report) => {
          const internship = Array.isArray(report.internships) ? report.internships[0] : report.internships;
          const company = internship
            ? (Array.isArray(internship.companies) ? internship.companies[0] : internship.companies)
            : null;
          const reporter = Array.isArray(report.profiles) ? report.profiles[0] : report.profiles;
          return (
            <Card key={report.id} className="border-0 shadow-sm">
              <CardContent className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <Link href={`/${locale}/internships/${internship?.id}`} className="font-semibold text-indigo-700 hover:underline">
                      {internship?.title ?? 'Deleted internship listing'}
                    </Link>
                    <p className="mt-1 text-sm text-gray-500">
                      {company?.name ?? 'Unknown company'} · Reported by {reporter?.full_name ?? 'Student'} · {new Date(report.created_at).toLocaleDateString('en-ET')}
                    </p>
                  </div>
                  <Badge variant={report.status === 'open' ? 'destructive' : 'secondary'}>{report.status.replace('_', ' ')}</Badge>
                </div>
                <div className="mt-3 rounded-md bg-gray-50 p-3 text-sm text-gray-700">
                  <Flag className="mr-1 inline h-4 w-4 text-amber-600" />{report.reason}
                </div>
                {report.status === 'open' ? (
                  <ListingReportReview reportId={report.id} initialNote={report.admin_note} />
                ) : (
                  <p className="mt-3 text-xs text-gray-500">
                    {report.admin_note || 'No admin note'}{report.reviewed_at ? ` · Reviewed ${new Date(report.reviewed_at).toLocaleDateString('en-ET')}` : ''}
                  </p>
                )}
              </CardContent>
            </Card>
          );
        }) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center text-gray-500">No listing reports yet.</CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
