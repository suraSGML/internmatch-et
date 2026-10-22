import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect, notFound } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { InternshipForm } from '../InternshipForm';
import { Card, CardContent } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Users, Send, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function EditInternshipPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();
  const { data: internship } = await service
    .from('internships')
    .select('*')
    .eq('id', id)
    .single();

  if (!internship) notFound();
  if (!['draft', 'open'].includes(internship.status)) notFound();

  // Verify ownership
  const { data: membership } = await service
    .from('company_members')
    .select('company_id, companies(industry)')
    .eq('user_id', user.id)
    .single();

  if (!membership || membership.company_id !== internship.company_id) {
    redirect(`/${locale}/company/internships`);
  }
  const companyJoin = membership.companies as
    | { industry?: string | null }
    | Array<{ industry?: string | null }>
    | null;
  const companyIndustry = Array.isArray(companyJoin)
    ? companyJoin[0]?.industry ?? null
    : companyJoin?.industry ?? null;

  const [{ data: fields }, { count: applicationCount }] = await Promise.all([
    service.from('fields').select('id, name_en').order('name_en'),
    service.from('applications').select('*', { count: 'exact', head: true }).eq('internship_id', id),
  ]);

  return (
    <DashboardLayout locale={locale}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{internship.title as string}</h1>
            <p className="text-gray-500 mt-1">Edit internship details.</p>
          </div>
          <StatusBadge status={internship.status as string} />
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Applications', value: applicationCount ?? 0, icon: Send },
            { label: 'Slots', value: `${internship.filled_slots}/${internship.slots}`, icon: Users },
            { label: 'Weeks', value: internship.duration_weeks, icon: Clock },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label} className="border-0 shadow-sm">
              <CardContent className="pt-3 pb-3 flex items-center gap-3">
                <Icon className="h-4 w-4 text-indigo-500 shrink-0" />
                <div>
                  <p className="text-sm font-bold">{value}</p>
                  <p className="text-xs text-gray-500">{label}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <InternshipForm
          fields={fields ?? []}
          industry={companyIndustry}
          locale={locale}
          mode="edit"
          internship={internship as Record<string, unknown>}
          internshipId={id}
        />
      </div>
    </DashboardLayout>
  );
}
