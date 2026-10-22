import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { SavedSearchManager } from './SavedSearchManager';
import { Search } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentSavedSearchesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: searches, error } = await supabase
    .from('saved_searches')
    .select('id, name, filters, alert_on, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (error) throw new Error(`Could not load saved searches: ${error.message}`);

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-bold text-gray-900">Saved searches & alerts</h1>
          <p className="mt-1 text-gray-500">Manage your saved internship filters and in-app alerts for new matching opportunities.</p>
        </header>
        {searches?.length ? (
          <SavedSearchManager searches={searches} locale={locale} />
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-12 text-center">
              <Search className="mx-auto mb-3 h-10 w-10 text-gray-300" />
              <p className="font-medium text-gray-700">No saved searches yet</p>
              <p className="mt-1 text-sm text-gray-500">Set filters in the internship browser, then save the search to get in-app alerts.</p>
              <Button asChild className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                <Link href={`/${locale}/internships`}>Find internships</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
