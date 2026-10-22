import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Shield, User } from 'lucide-react';

export const dynamic = 'force-dynamic';

// Color-code actions by category
function getActionColor(action: string) {
  if (action.includes('verified') || action.includes('approved') || action.includes('issued'))
    return 'bg-green-100 text-green-700';
  if (action.includes('rejected') || action.includes('revoked') || action.includes('suspended') || action.includes('terminated'))
    return 'bg-red-100 text-red-700';
  if (action.includes('created') || action.includes('submitted'))
    return 'bg-blue-100 text-blue-700';
  if (action.includes('updated') || action.includes('changed'))
    return 'bg-amber-100 text-amber-700';
  return 'bg-gray-100 text-gray-700';
}

export default async function AdminAuditPage({
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

  // Fetch last 200 audit log entries with actor name
  const { data: logs } = await supabase
    .from('audit_logs')
    .select(`
      id,
      action,
      target_type,
      target_id,
      details,
      ip_address,
      created_at,
      profiles!audit_logs_actor_id_fkey(full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200);

  type LogRow = {
    id: string;
    action: string;
    target_type: string | null;
    target_id: string | null;
    details: Record<string, unknown>;
    ip_address: string | null;
    created_at: string;
    profiles: { full_name: string } | null;
  };

  const rows = (logs ?? []) as unknown as LogRow[];

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="h-6 w-6 text-indigo-600" />
            Audit Log
          </h1>
          <p className="text-gray-500 mt-1">
            Immutable record of all admin and system actions. Last 200 entries.
          </p>
        </div>

        <Card className="border-0 shadow-sm">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50">
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Time</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Actor</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Action</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Target</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">Details</th>
                    <th className="text-left px-4 py-3 font-medium text-gray-600">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50 transition-colors">
                      {/* Time */}
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {new Date(log.created_at).toLocaleString('en-ET', {
                          year: 'numeric', month: 'short', day: 'numeric',
                          hour: '2-digit', minute: '2-digit',
                        })}
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <User className="h-3.5 w-3.5 text-gray-400 shrink-0" />
                          <span className="text-gray-700 text-xs">
                            {log.profiles?.full_name ?? 'System'}
                          </span>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3">
                        <Badge className={`text-xs font-mono ${getActionColor(log.action)}`}>
                          {log.action}
                        </Badge>
                      </td>

                      {/* Target */}
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {log.target_type ? (
                          <span className="font-medium text-gray-700">{log.target_type}</span>
                        ) : '—'}
                        {log.target_id && (
                          <span className="block font-mono text-gray-400 truncate max-w-[120px]">
                            {log.target_id.slice(0, 8)}…
                          </span>
                        )}
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3 text-xs text-gray-400 max-w-[200px]">
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <pre className="truncate font-mono text-xs text-gray-500 max-w-[200px] overflow-hidden">
                            {JSON.stringify(log.details)}
                          </pre>
                        ) : '—'}
                      </td>

                      {/* IP */}
                      <td className="px-4 py-3 text-xs text-gray-400 font-mono whitespace-nowrap">
                        {log.ip_address ?? '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {rows.length === 0 && (
                <div className="py-16 text-center">
                  <Shield className="h-10 w-10 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-400 font-medium">No audit entries yet</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Actions like verifying companies, issuing letters, and suspending users will appear here.
                  </p>
                </div>
              )}
            </div>

            {rows.length > 0 && (
              <div className="border-t px-4 py-3 text-xs text-gray-400 text-right">
                Showing {rows.length} most recent entries · Audit logs are append-only and cannot be modified.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
