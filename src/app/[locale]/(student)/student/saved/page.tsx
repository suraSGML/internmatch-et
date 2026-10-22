import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InternshipCard, type InternshipRow } from '@/components/internships/InternshipCard';
import { Card, CardContent } from '@/components/ui/card';
import { Bookmark } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export const dynamic = 'force-dynamic';

export default async function SavedInternshipsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: saved } = await supabase
    .from('saved_internships')
    .select(`
      internship_id,
      internships(
        id, title, description, location_city, work_mode, duration_weeks,
        deadline, created_at, is_paid, stipend_amount, status, requires_university_approval,
        required_skills, companies(name, slug, logo_url, status)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const internships = (saved ?? [])
    .map((s) => s.internships)
    .filter(Boolean);

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Saved Internships</h1>
          <p className="text-gray-500 mt-1">{internships.length} saved internship{internships.length !== 1 ? 's' : ''}</p>
        </div>

        {internships.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {internships.map((i) => (
              <InternshipCard
                key={(i as unknown as InternshipRow).id}
                internship={i as unknown as InternshipRow}
                locale={locale}
                isSaved
              />
            ))}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-14 text-center">
              <Bookmark className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">No saved internships</p>
              <p className="text-sm text-gray-400 mt-1">
                Browse internships and click the bookmark icon to save them here.
              </p>
              <Button asChild className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                <Link href={`/${locale}/internships`}>Browse Internships</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
