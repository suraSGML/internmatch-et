import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, GraduationCap } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function UniversityLayout({
  children,
  params,
}: {
  children: React.ReactNode;
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

  const role = profile?.role ?? user.user_metadata?.role;

  if (role !== 'university' && role !== 'admin') {
    redirect(`/${locale}/unauthorized`);
  }

  if (role === 'university') {
    const service = createServiceClient();
    const [
      { data: membership, error: membershipError },
      { data: request, error: requestError },
    ] = await Promise.all([
      service
        .from('university_members')
        .select('university_id')
        .eq('user_id', user.id)
        .maybeSingle(),
      service
        .from('university_registration_requests')
        .select('id, university_id, requested_university_name, status')
        .eq('user_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);
    if (membershipError) {
      throw new Error(`Could not check university coordinator access: ${membershipError.message}`);
    }
    if (requestError) {
      throw new Error(`Could not check university registration status: ${requestError.message}`);
    }

    let university: { name: string; status: string } | null = null;
    if (membership?.university_id) {
      const { data, error } = await service
        .from('universities')
        .select('name, status')
        .eq('id', membership.university_id)
        .maybeSingle();
      if (error) throw new Error(`Could not check university verification status: ${error.message}`);
      university = data;
    } else if (request?.university_id) {
      const { data, error } = await service
        .from('universities')
        .select('name, status')
        .eq('id', request.university_id)
        .maybeSingle();
      if (error) throw new Error(`Could not load requested university: ${error.message}`);
      university = data;
    }

    const verificationPending = request !== null || university?.status === 'pending';
    const universityNotVerified = university !== null && university.status !== 'verified';
    if (verificationPending || universityNotVerified) {
      const universityName = university?.name ?? request?.requested_university_name ?? 'your university';
      const rejected = university?.status === 'rejected';

      return (
        <DashboardLayout locale={locale}>
          <div className="mx-auto max-w-2xl py-10">
            <Card className="border-amber-200 bg-amber-50 shadow-sm">
              <CardContent className="flex items-start gap-4 p-6">
                <div className="rounded-full bg-amber-100 p-3">
                  {rejected
                    ? <GraduationCap className="h-6 w-6 text-amber-700" />
                    : <Clock className="h-6 w-6 text-amber-700" />}
                </div>
                <div className="space-y-2">
                  <h1 className="text-lg font-semibold text-amber-950">
                    {rejected ? 'University verification needs attention' : 'Please wait for university verification'}
                  </h1>
                  <p className="text-sm leading-6 text-amber-900">
                    {rejected
                      ? `${universityName} has not been verified. Contact the administrator to resolve the verification before using coordinator pages.`
                      : `Your request for ${universityName} is waiting for administrator approval. Coordinator pages will be available after the university is verified.`}
                  </p>
                  <p className="text-sm leading-6 text-amber-900">
                    Please make sure the official university name, coordinator details, and campus affiliation documents are accurate and complete. After verification, complete the university profile in Settings.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </DashboardLayout>
      );
    }
  }

  return <>{children}</>;
}
