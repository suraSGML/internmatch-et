import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Bell } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function StudentAnnouncementsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: studentProfile, error: profileError } = await service
    .from('student_profiles')
    .select('university_id, department_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (profileError) throw new Error(`Could not load your university details: ${profileError.message}`);

  if (!studentProfile?.university_id) {
    return (
      <DashboardLayout locale={locale}>
        <Card className="border-0 shadow-sm">
          <CardContent className="py-10 text-center text-gray-500">
            Link a university to your student profile to see coordinator announcements.
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  let query = service
    .from('announcements')
    .select('id, title, body, created_at, department_id, departments(name)')
    .eq('university_id', studentProfile.university_id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (studentProfile.department_id) {
    query = query.or(`department_id.is.null,department_id.eq.${studentProfile.department_id}`);
  } else {
    query = query.is('department_id', null);
  }
  const { data: announcements, error: announcementsError } = await query;
  if (announcementsError) throw new Error(`Could not load university announcements: ${announcementsError.message}`);

  return (
    <DashboardLayout locale={locale}>
      <div className="mx-auto max-w-3xl space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">University Announcements</h1>
          <p className="mt-1 text-gray-500">Updates from your university coordinator.</p>
        </div>
        {(announcements ?? []).map((announcement) => {
          const department = Array.isArray(announcement.departments)
            ? announcement.departments[0]
            : announcement.departments;
          return (
            <Card key={announcement.id} className="border-0 shadow-sm">
              <CardContent className="flex items-start gap-3 py-4">
                <Bell className="mt-1 h-4 w-4 shrink-0 text-indigo-500" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <h2 className="font-semibold text-gray-900">{announcement.title}</h2>
                    <time className="shrink-0 text-xs text-gray-400">
                      {new Date(announcement.created_at).toLocaleDateString('en-ET', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      })}
                    </time>
                  </div>
                  {department?.name && (
                    <p className="mt-1 text-xs text-indigo-600">{department.name}</p>
                  )}
                  <p className="mt-2 whitespace-pre-wrap text-sm text-gray-600">{announcement.body}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {!announcements?.length && (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-10 text-center text-sm text-gray-400">
              No announcements for you yet.
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}
