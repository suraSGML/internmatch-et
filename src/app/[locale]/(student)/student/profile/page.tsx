import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StudentProfileForm } from './StudentProfileForm';

import { computeProfileCompleteness } from '@/lib/profileCompleteness';

export const dynamic = 'force-dynamic';

export default async function StudentProfilePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();

  // Fetch profile + student_profile + universities + departments safely
  const [{ data: profile }, { data: studentProfile }, { data: universities }] =
    await Promise.all([
      service.from('profiles').select('*').eq('id', user.id).maybeSingle(),
      service
        .from('student_profiles')
        .select('*, departments(id, name), universities(id, name)')
        .eq('user_id', user.id)
        .maybeSingle(),
      service.from('universities').select('id, name').eq('status', 'verified').order('name'),
    ]);

  let departments: Array<{ id: string; name: string }> = [];
  if (studentProfile?.university_id) {
    const { data } = await service
      .from('departments')
      .select('id, name')
      .eq('university_id', studentProfile.university_id)
      .order('name');
    departments = data ?? [];
  }

  const { percentage: completeness, missingItems } = computeProfileCompleteness({
    fullName: profile?.full_name,
    phone: profile?.phone,
    city: profile?.city,
    avatarUrl: profile?.avatar_url,
    bio: studentProfile?.bio,
    skills: studentProfile?.skills as Array<unknown>,
    universityId: studentProfile?.university_id,
    departmentId: studentProfile?.department_id,
    yearOfStudy: studentProfile?.year_of_study,
    cvUrl: studentProfile?.cv_url,
  });

  return (
    <DashboardLayout locale={locale}>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-500 mt-1">
            Keep your profile up to date to improve your match score.
          </p>
        </div>
        <StudentProfileForm
          profile={profile}
          studentProfile={studentProfile}
          universities={universities ?? []}
          departments={departments}
          completeness={completeness}
          missingItems={missingItems}
          locale={locale}
        />
      </div>
    </DashboardLayout>
  );
}
