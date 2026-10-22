import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NotificationsClient, type NotificationItem } from '../(student)/student/notifications/NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function NotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: notifications, error } = await service
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(100);
  if (error) throw new Error(`Could not load your notifications: ${error.message}`);

  return (
    <DashboardLayout locale={locale}>
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="mt-1 text-gray-500">Application, interview, placement, and announcement updates.</p>
        </div>
        <NotificationsClient
          notifications={(notifications ?? []) as NotificationItem[]}
          locale={locale}
        />
      </div>
    </DashboardLayout>
  );
}
