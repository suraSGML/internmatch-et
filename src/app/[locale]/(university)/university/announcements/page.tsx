import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { AnnouncementForm } from './AnnouncementForm';
import { Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UniversityAnnouncementsPage({
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

  const [
    { data: announcements, error: announcementsError },
    { data: departments, error: departmentsError },
  ] = await Promise.all([
    service
      .from('announcements')
      .select('id, title, body, created_at, departments(name)')
      .eq('university_id', membership.university_id)
      .order('created_at', { ascending: false })
      .limit(20),
    service
      .from('departments')
      .select('id, name')
      .eq('university_id', membership.university_id)
      .order('name'),
  ]);
  if (announcementsError) throw new Error(`Could not load announcements: ${announcementsError.message}`);
  if (departmentsError) throw new Error(`Could not load university departments: ${departmentsError.message}`);

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
          <p className="text-gray-500 mt-1">Broadcast messages to your university&apos;s students.</p>
        </div>

        <AnnouncementForm
          universityId={membership.university_id}
          departments={departments ?? []}
        />

        <div className="space-y-3">
          {(announcements ?? []).map((a) => {
            const dept = Array.isArray(a.departments) ? a.departments[0] : a.departments as { name?: string } | null;
            return (
              <Card key={a.id} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start gap-3">
                    <Bell className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-sm text-gray-900">{a.title}</p>
                        <p className="text-xs text-gray-400 shrink-0">
                          {new Date(a.created_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      {(dept as { name?: string } | null)?.name && (
                        <p className="text-xs text-indigo-500 mb-1">
                          → {(dept as { name: string }).name}
                        </p>
                      )}
                      <p className="text-sm text-gray-600 whitespace-pre-wrap mt-1">{a.body}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {!announcements?.length && (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-8 text-center text-gray-400 text-sm">
                No announcements yet. Post one above.
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
