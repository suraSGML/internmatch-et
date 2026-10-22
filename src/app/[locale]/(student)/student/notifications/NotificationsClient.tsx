'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  CheckCircle2,
  Calendar,
  Briefcase,
  MessageSquare,
  Check,
  ExternalLink,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { markNotificationAsRead, markAllNotificationsAsRead } from '@/lib/actions/notifications';

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
}

interface Props {
  notifications: NotificationItem[];
  locale: string;
}

const SUPPORTED_LOCALES = ['en', 'am'];

function getNotificationHref(link: string | null, type: string, locale: string): string | null {
  if (!link?.trim() || link.trim().startsWith('//')) return null;

  let pathname: string;
  let search = '';
  let hash = '';
  try {
    const parsed = new URL(
      /^https?:\/\//i.test(link) ? link : link.startsWith('/') ? link : `/${link}`,
      'https://internmatch.local'
    );
    pathname = parsed.pathname;
    search = parsed.search;
    hash = parsed.hash;
  } catch {
    return null;
  }

  const firstSegment = pathname.split('/')[1];
  if (SUPPORTED_LOCALES.includes(firstSegment)) {
    pathname = pathname.slice(firstSegment.length + 1) || '/';
  }
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;

  // Older application notifications link to the internship rather than its applicants.
  if (
    type === 'application_received' &&
    /^\/company\/internships\/[^/]+\/?$/.test(pathname)
  ) {
    pathname = `${pathname.replace(/\/$/, '')}/applicants`;
  }

  return `/${locale}${pathname}${search}${hash}`;
}

export function NotificationsClient({ notifications: initialNotifications, locale }: Props) {
  const router = useRouter();
  const [notifications, setNotifications] = useState(initialNotifications);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.read_at).length;
  const filtered = filter === 'unread' ? notifications.filter((n) => !n.read_at) : notifications;

  const handleMarkOne = (id: string) => {
    startTransition(async () => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      const res = await markNotificationAsRead(id);
      if (res?.error) {
        toast.error('Failed to update notification');
      } else {
        router.refresh();
      }
    });
  };

  const handleMarkAll = () => {
    startTransition(async () => {
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: n.read_at || new Date().toISOString() }))
      );
      const res = await markAllNotificationsAsRead();
      if (res?.error) {
        toast.error('Failed to mark all as read');
      } else {
        toast.success('All marked as read');
        router.refresh();
      }
    });
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'interview':
      case 'interview_scheduled':
        return <Calendar className="h-4 w-4 text-purple-600" />;
      case 'application':
      case 'application_status_changed':
        return <Briefcase className="h-4 w-4 text-indigo-600" />;
      case 'placement':
      case 'placement_approved':
      case 'placement_rejected':
      case 'placement_pending_approval':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'message':
        return <MessageSquare className="h-4 w-4 text-blue-600" />;
      case 'announcement':
        return <Bell className="h-4 w-4 text-indigo-600" />;
      default:
        return <Bell className="h-4 w-4 text-amber-600" />;
    }
  };

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);
    if (diffSec < 60) return 'Just now';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 604800) return `${Math.floor(diffSec / 86400)}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Header toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as 'all' | 'unread')}>
          <TabsList className="bg-gray-100">
            <TabsTrigger value="all" className="text-xs">
              All ({notifications.length})
            </TabsTrigger>
            <TabsTrigger value="unread" className="text-xs">
              Unread {unreadCount > 0 && `(${unreadCount})`}
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={handleMarkAll}
            className="text-xs text-gray-600 hover:text-indigo-600 gap-1.5"
          >
            <Check className="h-3.5 w-3.5" />
            Mark all as read
          </Button>
        )}
      </div>

      {/* Notifications list */}
      {filtered.length === 0 ? (
        <Card className="border-0 shadow-sm py-12 text-center">
          <CardContent className="space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
              <Bell className="h-6 w-6" />
            </div>
            <div>
              <p className="font-semibold text-gray-900">
                {filter === 'unread' ? 'No unread notifications' : 'No notifications yet'}
              </p>
              <p className="text-xs text-gray-500 max-w-xs mx-auto mt-1">
                Updates about applications, interviews, placements, and announcements will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const isUnread = !item.read_at;
            const fullLink = getNotificationHref(item.link, item.type, locale);

            return (
              <Card
                key={item.id}
                className={`border transition-all ${
                  isUnread
                    ? 'border-indigo-100 bg-indigo-50/30 shadow-sm'
                    : 'border-gray-100 bg-white hover:bg-gray-50/50'
                }`}
              >
                <CardContent className="p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-50 border border-gray-100 flex items-center justify-center shrink-0 mt-0.5">
                    {getIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm ${isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                          {item.title}
                        </span>
                        {isUnread && (
                          <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                        )}
                      </div>
                      <span className="text-xs text-gray-400 shrink-0 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(item.created_at)}
                      </span>
                    </div>

                    {item.body && (
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {item.body}
                      </p>
                    )}

                    <div className="flex items-center gap-2 pt-1">
                      {fullLink && (
                        <Link
                          href={fullLink}
                          onClick={() => isUnread && handleMarkOne(item.id)}
                          className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 font-medium hover:underline"
                        >
                          View Details
                          <ExternalLink className="h-3 w-3" />
                        </Link>
                      )}

                      {isUnread && (
                        <button
                          type="button"
                          onClick={() => handleMarkOne(item.id)}
                          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          Mark as read
                        </button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
