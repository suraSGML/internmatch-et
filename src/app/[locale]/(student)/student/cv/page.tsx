import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { redirect } from 'next/navigation';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { CVBuilderClient } from './CVBuilderClient';
import { computeProfileCompleteness } from '@/lib/profileCompleteness';

export const dynamic = 'force-dynamic';

export default async function StudentCVPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login`);

  const service = createServiceClient();

  const [{ data: profile }, { data: sp }] = await Promise.all([
    service.from('profiles').select('full_name, phone, city, avatar_url').eq('id', user.id).maybeSingle(),
    service
      .from('student_profiles')
      .select('bio, skills, languages, links, cv_url, university_id, department_id, year_of_study')
      .eq('user_id', user.id)
      .maybeSingle(),
  ]);

  const { percentage: completeness, missingItems } = computeProfileCompleteness({
    fullName: profile?.full_name,
    phone: profile?.phone,
    city: profile?.city,
    avatarUrl: profile?.avatar_url,
    bio: sp?.bio,
    skills: sp?.skills as Array<unknown>,
    universityId: sp?.university_id,
    departmentId: sp?.department_id,
    yearOfStudy: sp?.year_of_study,
    cvUrl: sp?.cv_url,
  });

  return (
    <DashboardLayout locale={locale}>
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My CV</h1>
          <p className="text-gray-500 mt-1">
            Generate a professional PDF CV from your profile.
          </p>
        </div>
        <CVBuilderClient
          completeness={completeness}
          missingItems={missingItems}
          uploadedCvUrl={sp?.cv_url ?? null}
          locale={locale}
        />
      </div>
    </DashboardLayout>
  );
}
