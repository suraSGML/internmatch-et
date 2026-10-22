'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Briefcase, Menu, X, Globe, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUser } from '@/hooks/useUser';
import { useSupabase } from '@/hooks/useSupabase';
import { getInitials } from '@/lib/utils';
import type { UserRole } from '@/types';

const DASHBOARD_PATHS: Record<UserRole, string> = {
  student: '/student/dashboard',
  company: '/company/dashboard',
  university: '/university/dashboard',
  admin: '/admin',
};

interface NavbarProps {
  locale: string;
}

export function Navbar({ locale }: NavbarProps) {
  const t = useTranslations('nav');
  const tCommon = useTranslations('common');
  const tAuth = useTranslations('auth');
  const { user, role } = useUser();
  const supabase = useSupabase();
  const router = useRouter();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const otherLocale = locale === 'en' ? 'am' : 'en';
  const otherLocaleLabel = locale === 'en' ? 'አማ' : 'EN';

  // Strip current locale from pathname and prepend the other locale
  const switchLocalePath = () => {
    const withoutLocale = pathname.replace(new RegExp(`^/${locale}`), '') || '/';
    return `/${otherLocale}${withoutLocale}`;
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.push(`/${locale}/login`);
  };

  const navLinks = [
    { href: `/${locale}`, label: t('home') },
    { href: `/${locale}/internships`, label: t('internships') },
    { href: `/${locale}/companies`, label: t('companies') },
    { href: `/${locale}/about`, label: t('about') },
  ];

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-4">
        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2 font-bold text-indigo-600">
          <Briefcase className="h-6 w-6" />
          <span className="text-lg hidden sm:inline">InternMatch ET</span>
        </Link>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-gray-600 hover:text-indigo-600 transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>

        {/* Right side: language switcher + auth */}
        <div className="flex items-center gap-2">
          {/* Language switcher */}
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="gap-1 text-gray-600"
            aria-label="Switch language"
          >
            <Link href={switchLocalePath()}>
              <Globe className="h-4 w-4" />
              <span className="text-xs font-medium">{otherLocaleLabel}</span>
            </Link>
          </Button>

          {/* Auth state */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user.user_metadata?.avatar_url} />
                    <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs">
                      {getInitials(user.user_metadata?.full_name ?? user.email ?? 'U')}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3 w-3 text-gray-500" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5 text-sm font-medium truncate">
                  {user.user_metadata?.full_name ?? user.email}
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={`/${locale}${role ? DASHBOARD_PATHS[role] : '/'}`}>
                    {t('dashboard')}
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-red-600 cursor-pointer">
                  {locale === 'am' ? 'ውጣ' : 'Sign Out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              <Button variant="ghost" size="sm" asChild>
                <Link href={`/${locale}/login`}>{t('login')}</Link>
              </Button>
              <Button size="sm" asChild className="bg-indigo-600 hover:bg-indigo-700">
                <Link href={`/${locale}/register`}>{t('register')}</Link>
              </Button>
            </div>
          )}

          {/* Mobile hamburger */}
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-64">
              <div className="flex flex-col gap-4 pt-4">
                <Link
                  href={`/${locale}`}
                  className="flex items-center gap-2 font-bold text-indigo-600 pb-2 border-b"
                  onClick={() => setMobileOpen(false)}
                >
                  <Briefcase className="h-5 w-5" />
                  InternMatch ET
                </Link>
                {navLinks.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="text-sm font-medium text-gray-700 hover:text-indigo-600 py-1"
                    onClick={() => setMobileOpen(false)}
                  >
                    {link.label}
                  </Link>
                ))}
                {!user && (
                  <div className="flex flex-col gap-2 pt-2 border-t">
                    <Button variant="outline" asChild onClick={() => setMobileOpen(false)}>
                      <Link href={`/${locale}/login`}>{t('login')}</Link>
                    </Button>
                    <Button asChild className="bg-indigo-600 hover:bg-indigo-700" onClick={() => setMobileOpen(false)}>
                      <Link href={`/${locale}/register`}>{t('register')}</Link>
                    </Button>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
