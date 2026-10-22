import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { GraduationCap, User, Bell } from 'lucide-react';
import { UniversityInfoForm } from './UniversityInfoForm';
import { ProfileSettingsForm } from './ProfileSettingsForm';

export const dynamic = 'force-dynamic';

export default async function UniversitySettingsPage({
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
    .select('role, full_name, phone, city')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['university', 'admin'].includes(profile.role)) {
    redirect(`/${locale}/unauthorized`);
  }

  const { data: membership } = await supabase
    .from('university_members')
    .select('university_id, member_role')
    .eq('user_id', user.id)
    .maybeSingle();

  let university: {
    id: string;
    name: string;
    status: string;
    letterhead: { header_text?: string; footer_text?: string; accent_color?: string } | null;
  } | null = null;

  if (membership?.university_id) {
    const { data: uni } = await supabase
      .from('universities')
      .select('id, name, status, letterhead')
      .eq('id', membership.university_id)
      .maybeSingle();
    university = uni as {
      id: string;
      name: string;
      status: string;
      letterhead: { header_text?: string; footer_text?: string; accent_color?: string } | null;
    } | null;
  }

  return (
    <DashboardLayout locale={locale}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
            <p className="text-gray-500 mt-1">Manage your university and account settings.</p>
          </div>
          {university && <StatusBadge status={university.status} />}
        </div>

        {/* Section 1: University info + letterhead */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-indigo-600" />
              University Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            {university ? (
              <UniversityInfoForm
                universityId={university.id}
                universityName={university.name}
                universityStatus={university.status}
                memberRole={membership?.member_role ?? ''}
                letterhead={university.letterhead}
              />
            ) : (
              <p className="text-sm text-gray-500">
                No university linked to your account. Contact an admin to be assigned.
              </p>
            )}
          </CardContent>
        </Card>

        {/* Section 2: Profile settings */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <User className="h-4 w-4 text-indigo-600" />
              Profile Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ProfileSettingsForm
              fullName={profile.full_name ?? ''}
              phone={profile.phone ?? ''}
              city={profile.city ?? ''}
            />
          </CardContent>
        </Card>

        {/* Section 3: Notification preferences (static UI) */}
        <Card className="border-0 shadow-sm">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="h-4 w-4 text-indigo-600" />
              Notification Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: 'New placements submitted for approval', checked: true },
              { label: 'Logbook submissions from students', checked: true },
              { label: 'Placement letter requests', checked: false },
            ].map(({ label, checked }) => (
              <label key={label} className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  defaultChecked={checked}
                  className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  disabled
                />
                <span className="text-sm text-gray-700">{label}</span>
                <span className="text-xs text-gray-400 ml-auto">(coming soon)</span>
              </label>
            ))}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
