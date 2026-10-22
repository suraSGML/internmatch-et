import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Tag } from 'lucide-react';
import { AddFieldForm } from './AddFieldForm';
import { AddSkillForm } from './AddSkillForm';
import { DeleteFieldButton } from './DeleteFieldButton';
import { DeleteSkillButton } from './DeleteSkillButton';

export const dynamic = 'force-dynamic';

export default async function AdminFieldsPage({
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

  const [{ data: fields }, { data: skills }] = await Promise.all([
    supabase.from('fields').select('id, name_en, name_am').order('name_en'),
    supabase.from('skills').select('id, name').order('name'),
  ]);

  return (
    <DashboardLayout locale={locale}>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-6 w-6 text-indigo-600" />
            Fields &amp; Skills
          </h1>
          <p className="text-gray-500 mt-1">
            Manage internship categories and skill tags used across the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* ── Internship Fields ─────────────────────────────────────── */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ClipboardList className="h-4 w-4 text-indigo-500" />
                Internship Fields
                <span className="ml-auto text-xs font-normal text-gray-400">
                  {fields?.length ?? 0} total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddFieldForm />
              <div className="divide-y max-h-96 overflow-y-auto">
                {(fields ?? []).map((f) => (
                  <div key={f.id} className="flex items-center justify-between py-2.5 gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-800">{f.name_en}</p>
                      <p className="text-xs text-gray-400">{f.name_am}</p>
                    </div>
                    <DeleteFieldButton fieldId={f.id} fieldName={f.name_en} />
                  </div>
                ))}
                {(!fields || fields.length === 0) && (
                  <p className="text-sm text-gray-400 py-4 text-center">No fields yet.</p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ── Skills ───────────────────────────────────────────────── */}
          <Card className="border-0 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Tag className="h-4 w-4 text-indigo-500" />
                Skills
                <span className="ml-auto text-xs font-normal text-gray-400">
                  {skills?.length ?? 0} total
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <AddSkillForm />
              <div className="flex flex-wrap gap-2 max-h-96 overflow-y-auto pt-1">
                {(skills ?? []).map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center gap-1 bg-gray-100 rounded-full pl-3 pr-1 py-1 text-sm text-gray-700"
                  >
                    {s.name}
                    <DeleteSkillButton skillId={s.id} skillName={s.name} />
                  </div>
                ))}
                {(!skills || skills.length === 0) && (
                  <p className="text-sm text-gray-400">No skills yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}
