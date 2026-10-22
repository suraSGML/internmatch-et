'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUser } from '@/hooks/useUser';
import { getUnreadNotificationCount } from '@/lib/actions/notifications';

export function NotificationBell({ locale }: { locale: string }) {
  const { user } = useUser();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!user) return;

    let active = true;
    const loadUnreadCount = async () => {
      try {
        const result = await getUnreadNotificationCount();
        if ('error' in result) {
          console.error('Could not load unread notification count:', result.error);
          return;
        }
        if (active) setUnreadCount(result.count);
      } catch (error) {
        console.error('Could not request unread notification count:', error);
      }
    };

    void loadUnreadCount();
    const intervalId = window.setInterval(loadUnreadCount, 30_000);
    window.addEventListener('focus', loadUnreadCount);

    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener('focus', loadUnreadCount);
    };
  }, [user]);

  const visibleUnreadCount = user ? unreadCount : 0;

  return (
    <Button variant="ghost" size="icon" className="relative" asChild>
      <Link
        href={`/${locale}/notifications`}
        aria-label={visibleUnreadCount ? `Notifications, ${visibleUnreadCount} unread` : 'Notifications'}
      >
        <Bell className="h-5 w-5 text-gray-500" />
        {visibleUnreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-semibold text-white">
            {visibleUnreadCount > 99 ? '99+' : visibleUnreadCount}
          </span>
        )}
      </Link>
    </Button>
  );
}
