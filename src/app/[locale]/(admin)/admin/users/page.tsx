import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SuspendUserButton } from './SuspendUserButton';
import { Users, GraduationCap, Building2, University, Shield } from 'lucide-react';

export const dynamic = 'force-dynamic';

const ROLE_ICONS: Record<string, React.ElementType> = {
  student:    GraduationCap,
  company:    Building2,
  university: University,
  admin:      Shield,
};

const ROLE_COLORS: Record<string, string> = {
  student:    'bg-blue-50 text-blue-700',
  company:    'bg-purple-50 text-purple-700',
  university: 'bg-green-50 text-green-700',
  admin:      'bg-red-50 text-red-700',
};

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'admin') redirect(`/${locale}/unauthorized`);

  const { data: users } = await supabase
    .from('profiles')
    .select('id, full_name, role, phone, city, is_suspended, created_at')
    .order('created_at', { ascending: false });

  const all = users ?? [];
  const byRole = {
    student:    all.filter((u) => u.role === 'student'),
    company:    all.filter((u) => u.role === 'company'),
    university: all.filter((u) => u.role === 'university'),
    admin:      all.filter((u) => u.role === 'admin'),
  };

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            User Management
          </h1>
          <p className="text-gray-500 mt-1">View and manage all registered users.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {(Object.entries(byRole) as [string, typeof all][]).map(([role, list]) => {
            const Icon = ROLE_ICONS[role] ?? Users;
            return (
              <Card key={role} className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${ROLE_COLORS[role]}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xl font-bold">{list.length}</p>
                      <p className="text-xs text-gray-500 capitalize">{role}s</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* User table */}
        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Name</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Role</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">City</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Status</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Joined</th>
                    <th className="text-right px-4 py-3 font-medium text-gray-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {all.map((u) => {
                    const Icon = ROLE_ICONS[u.role] ?? Users;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${ROLE_COLORS[u.role]}`}>
                              {u.full_name?.charAt(0) ?? '?'}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{u.full_name}</p>
                              {u.phone && <p className="text-xs text-gray-400">{u.phone}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${ROLE_COLORS[u.role]}`}>
                            <Icon className="h-3 w-3" />
                            {u.role}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.city ?? '—'}</td>
                        <td className="px-4 py-3">
                          {u.is_suspended ? (
                            <Badge variant="destructive" className="text-xs">Suspended</Badge>
                          ) : (
                            <Badge className="text-xs bg-green-100 text-green-700 hover:bg-green-100">Active</Badge>
                          )}
                        </td>
                        <td className="px-4 py-3 text-gray-500 text-xs">
                          {new Date(u.created_at).toLocaleDateString('en-ET', {
                            year: 'numeric', month: 'short', day: 'numeric',
                          })}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {u.id !== user.id && u.role !== 'admin' && (
                            <SuspendUserButton
                              userId={u.id}
                              isSuspended={u.is_suspended}
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {all.length === 0 && (
                <div className="py-12 text-center text-gray-400">
                  <Users className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p>No users found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
