import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InternshipCard, type InternshipRow } from '@/components/internships/InternshipCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Briefcase } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CompanyInternshipsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .single();

  if (!membership) redirect(`/${locale}/onboarding`);

  const { data: internships } = await supabase
    .from('internships')
    .select('id, title, description, location_city, work_mode, duration_weeks, deadline, is_paid, stipend_amount, status, requires_university_approval, required_skills, slots, filled_slots, companies(name, status)')
    .eq('company_id', membership.company_id)
    .order('created_at', { ascending: false });

  const open = internships?.filter((i) => i.status === 'open') ?? [];
  const draft = internships?.filter((i) => i.status === 'draft') ?? [];
  const closed = internships?.filter((i) => ['closed', 'filled', 'cancelled'].includes(i.status)) ?? [];

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Internships</h1>
            <p className="text-gray-500 mt-1">Manage your internship listings.</p>
          </div>
          <Button asChild className="bg-indigo-600 hover:bg-indigo-700 gap-2">
            <Link href={`/${locale}/company/internships/new`}>
              <Plus className="h-4 w-4" />
              Post Internship
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Open', count: open.length, color: 'text-green-700' },
            { label: 'Drafts', count: draft.length, color: 'text-gray-600' },
            { label: 'Closed', count: closed.length, color: 'text-slate-500' },
          ].map(({ label, count, color }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="pt-4 pb-4 text-center">
                <p className={`text-2xl font-bold ${color}`}>{count}</p>
                <p className="text-xs text-gray-500 mt-1">{label}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Listings */}
        {internships && internships.length > 0 ? (
          <div className="space-y-6">
            {open.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3">Open ({open.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {open.map((i) => (
                    <InternshipCard
                      key={i.id}
                      internship={i as unknown as InternshipRow}
                      locale={locale}
                      showStatus
                    />
                  ))}
                </div>
              </section>
            )}
            {draft.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">Drafts ({draft.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {draft.map((i) => (
                    <InternshipCard
                      key={i.id}
                      internship={i as unknown as InternshipRow}
                      locale={locale}
                      showStatus
                    />
                  ))}
                </div>
              </section>
            )}
            {closed.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wide mb-3">Closed ({closed.length})</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {closed.map((i) => (
                    <InternshipCard
                      key={i.id}
                      internship={i as unknown as InternshipRow}
                      locale={locale}
                      showStatus
                    />
                  ))}
                </div>
              </section>
            )}
          </div>
        ) : (
          <Card className="border-0 shadow-sm">
            <CardContent className="py-14 text-center">
              <Briefcase className="h-12 w-12 mx-auto mb-3 text-gray-300" />
              <p className="font-medium text-gray-600">No internships yet</p>
              <p className="text-sm text-gray-400 mt-1">Post your first internship to start receiving applications.</p>
              <Button asChild className="mt-4 bg-indigo-600 hover:bg-indigo-700 gap-2">
                <Link href={`/${locale}/company/internships/new`}>
                  <Plus className="h-4 w-4" />
                  Post Internship
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
}

