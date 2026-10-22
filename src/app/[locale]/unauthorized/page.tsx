import Link from 'next/link';
import { ShieldX, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createClient } from '@/lib/supabase/server';
import type { UserRole } from '@/types';

const DASHBOARD_BY_ROLE: Record<UserRole, string> = {
  student:    '/student/dashboard',
  company:    '/company/dashboard',
  university: '/university/dashboard',
  admin:      '/admin',
};

export default async function UnauthorizedPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let dashboardHref = `/${locale}/login`;
  let roleName = '';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single();

    const role = (profile?.role ?? 'student') as UserRole;
    dashboardHref = `/${locale}${DASHBOARD_BY_ROLE[role]}`;
    roleName = role.charAt(0).toUpperCase() + role.slice(1);
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-red-100 mb-6">
          <ShieldX className="h-10 w-10 text-red-500" />
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
        <p className="text-gray-500 mb-2">
          You don&apos;t have permission to view this page.
        </p>
        {roleName && (
          <p className="text-sm text-gray-400 mb-8">
            Your account role is <span className="font-semibold text-indigo-600">{roleName}</span>.
            This page is restricted to a different role.
          </p>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button asChild variant="outline">
            <Link href={dashboardHref}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to My Dashboard
            </Link>
          </Button>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
            <Link href={`/${locale}`}>Back to Home</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
