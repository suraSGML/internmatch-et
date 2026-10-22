'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  LayoutDashboard,
  User,
  FileText,
  Send,
  BookMarked,
  Calendar,
  MapPin,
  BookOpen,
  Award,
  Bell,
  Briefcase,
  Users,
  ClipboardList,
  BarChart2,
  GraduationCap,
  Building2,
  Shield,
  Menu,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Home,
  Search,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn, getInitials } from '@/lib/utils';
import { useUser } from '@/hooks/useUser';
import { useSupabase } from '@/hooks/useSupabase';
import { NotificationBell } from '@/components/shared/NotificationBell';
import { useCompanyVerification } from '@/components/company/CompanyVerificationContext';
import type { UserRole } from '@/types';

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  badge?: number;
}

function getNavItems(role: UserRole, locale: string, tStudent: ReturnType<typeof useTranslations>, tCompany: ReturnType<typeof useTranslations>, tUniversity: ReturnType<typeof useTranslations>, tAdmin: ReturnType<typeof useTranslations>): NavItem[] {
  const base = `/${locale}`;
  switch (role) {
    case 'student':
      return [
        { label: 'Home', href: `${base}`, icon: Home },
        { label: 'Browse Internships', href: `${base}/internships`, icon: Search },
        { label: tStudent('dashboard'), href: `${base}/student/dashboard`, icon: LayoutDashboard },
        { label: 'University Announcements', href: `${base}/student/announcements`, icon: Bell },
        { label: tStudent('profile'), href: `${base}/student/profile`, icon: User },
        { label: tStudent('cv'), href: `${base}/student/cv`, icon: FileText },
        { label: tStudent('applications'), href: `${base}/student/applications`, icon: Send },
        { label: tStudent('saved'), href: `${base}/student/saved`, icon: BookMarked },
        { label: 'Saved Searches', href: `${base}/student/searches`, icon: Search },
        { label: tStudent('interviews'), href: `${base}/student/interviews`, icon: Calendar },
        { label: tStudent('placement'), href: `${base}/student/placement`, icon: MapPin },
        { label: tStudent('logbook'), href: `${base}/student/logbook`, icon: BookOpen },
        { label: tStudent('certificates'), href: `${base}/student/certificates`, icon: Award },
        { label: tStudent('notifications'), href: `${base}/student/notifications`, icon: Bell },
      ];
    case 'company':
      return [
        { label: 'Home', href: `${base}`, icon: Home },
        { label: 'Post Internship', href: `${base}/company/internships/new`, icon: Briefcase },
        { label: tCompany('dashboard'), href: `${base}/company/dashboard`, icon: LayoutDashboard },
        { label: tCompany('internships'), href: `${base}/company/internships`, icon: ClipboardList },
        { label: tCompany('applicants'), href: `${base}/company/applicants`, icon: Users },
        { label: tCompany('interns'), href: `${base}/company/interns`, icon: GraduationCap },
        { label: 'Notifications', href: `${base}/notifications`, icon: Bell },
        { label: tCompany('team'), href: `${base}/company/team`, icon: Users },
        { label: tCompany('profile'), href: `${base}/company/profile`, icon: Building2 },
        { label: tCompany('reports'), href: `${base}/company/reports`, icon: BarChart2 },
      ];
    case 'university':
      return [
        { label: 'Home', href: `${base}`, icon: Home },
        { label: 'View Internships', href: `${base}/internships`, icon: Search },
        { label: tUniversity('dashboard'), href: `${base}/university/dashboard`, icon: LayoutDashboard },
        { label: tUniversity('students'), href: `${base}/university/students`, icon: GraduationCap },
        { label: tUniversity('placements'), href: `${base}/university/placements`, icon: MapPin },
        { label: tUniversity('letters'), href: `${base}/university/letters`, icon: FileText },
        { label: tUniversity('logbooks'), href: `${base}/university/logbooks`, icon: BookOpen },
        { label: tUniversity('reports'), href: `${base}/university/reports`, icon: BarChart2 },
        { label: tUniversity('announcements'), href: `${base}/university/announcements`, icon: Bell },
        { label: tUniversity('settings'), href: `${base}/university/settings`, icon: ClipboardList },
      ];
    case 'admin':
      return [
        { label: 'Home', href: `${base}`, icon: Home },
        { label: tAdmin('dashboard'), href: `${base}/admin`, icon: LayoutDashboard },
        { label: tAdmin('companies'), href: `${base}/admin/companies`, icon: Building2 },
        { label: tAdmin('universities'), href: `${base}/admin/universities`, icon: GraduationCap },
        { label: 'Listing reports', href: `${base}/admin/listing-reports`, icon: Shield },
        { label: tAdmin('reports'), href: `${base}/admin/reports`, icon: BarChart2 },
        { label: tAdmin('users'), href: `${base}/admin/users`, icon: Users },
        { label: tAdmin('fields'), href: `${base}/admin/fields`, icon: ClipboardList },
        { label: tAdmin('audit'), href: `${base}/admin/audit`, icon: Shield },
      ];
  }
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  locale: string;
}

export function DashboardLayout({ children, locale }: DashboardLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const { user, role } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const pathname = usePathname();

  const tStudent = useTranslations('student');
  const tCompany = useTranslations('company');
  const tUniversity = useTranslations('university');
  const tAdmin = useTranslations('admin');
  const companyVerification = useCompanyVerification();

  const userRole = role ?? 'student';
  const navItems = getNavItems(userRole, locale, tStudent, tCompany, tUniversity, tAdmin);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  };

  const renderSidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className={cn('flex items-center gap-2 px-4 py-4 border-b', collapsed && 'justify-center')}>
        <Briefcase className="h-6 w-6 text-indigo-600 shrink-0" />
        {!collapsed && (
          <span className="font-bold text-indigo-700 text-sm">InternMatch ET</span>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                collapsed && 'justify-center px-2'
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn('h-4 w-4 shrink-0', isActive && 'text-indigo-600')} />
              {!collapsed && <span className="truncate">{item.label}</span>}
              {!collapsed && item.badge && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {item.badge}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      {/* User info + sign out */}
      <div className={cn('border-t p-3', collapsed && 'flex justify-center')}>
        {!collapsed && user && (
          <div className="flex items-center gap-2 mb-2 px-1">
            <Avatar className="h-7 w-7">
              <AvatarImage src={user.user_metadata?.avatar_url} />
              <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
                {getInitials(user.user_metadata?.full_name ?? user.email ?? 'U')}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium truncate">
                {user.user_metadata?.full_name ?? 'User'}
              </p>
              <p className="text-xs text-gray-500 truncate">{user.email}</p>
            </div>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className={cn(
            'w-full text-gray-500 hover:text-red-600',
            collapsed ? 'justify-center px-2' : 'justify-start gap-2'
          )}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && 'Sign Out'}
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          'hidden md:flex flex-col border-r bg-white transition-all duration-200',
          collapsed ? 'w-16' : 'w-60'
        )}
      >
        {renderSidebarContent()}
        {/* Collapse toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute left-0 top-1/2 -translate-y-1/2 ml-[calc(theme(spacing.60)-12px)] z-10 hidden md:flex h-6 w-6 items-center justify-center rounded-full border bg-white text-gray-500 hover:text-gray-700 shadow-sm transition-all"
          style={{ marginLeft: collapsed ? 'calc(4rem - 12px)' : 'calc(15rem - 12px)' }}
          aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute left-0 top-0 h-full w-64 bg-white shadow-xl z-50">
            {renderSidebarContent()}
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 border-b bg-white flex items-center gap-3 px-4 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex-1" />
          <NotificationBell locale={locale} />
          {/* User avatar */}
          <Avatar className="h-8 w-8 cursor-pointer">
            <AvatarImage src={user?.user_metadata?.avatar_url} />
            <AvatarFallback className="text-xs bg-indigo-100 text-indigo-700">
              {getInitials(user?.user_metadata?.full_name ?? user?.email ?? 'U')}
            </AvatarFallback>
          </Avatar>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {companyVerification && (
            <div
              role="status"
              className={cn(
                'mb-5 rounded-lg border p-4',
                companyVerification.status === 'rejected'
                  ? 'border-red-200 bg-red-50 text-red-900'
                  : 'border-amber-200 bg-amber-50 text-amber-900'
              )}
            >
              <p className="text-sm font-semibold">
                {companyVerification.status === 'rejected'
                  ? 'Company verification rejected'
                  : 'Company verification pending'}
              </p>
              <p className="mt-1 text-sm">
                {companyVerification.status === 'rejected'
                  ? `${companyVerification.name} was not approved. ${companyVerification.reviewNote ?? 'Review your company details and submit corrected registration documents for administrator review.'}`
                  : `${companyVerification.name} is awaiting administrator review. You cannot post internships until it is verified.`}
              </p>
              <Link
                href={`/${locale}/company/profile`}
                className="mt-2 inline-block text-sm font-medium underline underline-offset-2"
              >
                Review company profile and registration documents
              </Link>
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
