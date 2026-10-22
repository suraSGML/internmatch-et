import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { NotificationsClient, type NotificationItem } from './NotificationsClient';

export const dynamic = 'force-dynamic';

export default async function StudentNotificationsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: notifications, error: notificationsError } = await service
    .from('notifications')
    .select('id, type, title, body, link, read_at, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  if (notificationsError) {
    throw new Error(`Could not load your notifications: ${notificationsError.message}`);
  }

  return (
    <DashboardLayout locale={locale}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          <p className="text-gray-500 mt-1">
            Stay updated on your applications, interviews, and university placement milestones.
          </p>
        </div>
        <NotificationsClient
          notifications={(notifications ?? []) as NotificationItem[]}
          locale={locale}
        />
      </div>
    </DashboardLayout>
  );
}
