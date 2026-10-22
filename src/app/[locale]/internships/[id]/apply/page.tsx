import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ApplyForm } from './ApplyForm';
import { isDepartmentEligible } from '@/lib/matching/departmentEligibility';

export const dynamic = 'force-dynamic';

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect(`/${locale}/login?next=/${locale}/internships/${id}/apply`);

  const { data: internship } = await supabase
    .from('internships')
    .select('id, title, status, deadline, location_city, work_mode, duration_weeks, is_paid, stipend_amount, required_department, companies(name), internship_questions(id, question, is_required, sort_order)')
    .eq('id', id)
    .single();

  if (!internship || internship.status !== 'open') notFound();

  // Existing application check
  const { data: existing } = await supabase
    .from('applications')
    .select('id, status')
    .eq('student_id', user.id)
    .eq('internship_id', id)
    .single();

  // Student CV url
  const service = createServiceClient();
  const { data: studentProfile, error: studentProfileError } = await service
    .from('student_profiles')
    .select('cv_url, department_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (studentProfileError) {
    throw new Error(`Could not load your student profile: ${studentProfileError.message}`);
  }

  let studentDepartment: string | null = null;
  if (studentProfile?.department_id) {
    const { data: department, error: departmentError } = await service
      .from('departments')
      .select('name')
      .eq('id', studentProfile.department_id)
      .maybeSingle();
    if (departmentError) {
      throw new Error(`Could not load your department: ${departmentError.message}`);
    }
    studentDepartment = department?.name ?? null;
  }
  const departmentEligible = isDepartmentEligible(
    studentDepartment,
    internship.required_department
  );

  const companyRaw = internship.companies;
  const company = Array.isArray(companyRaw) ? companyRaw[0] : companyRaw;
  const questions = (
    (internship.internship_questions as Array<{ id: string; question: string; is_required: boolean; sort_order: number }>) ?? []
  ).sort((a, b) => a.sort_order - b.sort_order);

  const daysLeft = Math.ceil(
    (new Date(internship.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-8 max-w-xl">
          <Link
            href={`/${locale}/internships/${id}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-4"
          >
            <ArrowLeft className="h-4 w-4" /> Back to internship
          </Link>

          {/* Header */}
          <Card className="border-0 shadow-sm mb-5">
            <CardContent className="pt-4 pb-4">
              <h1 className="font-bold text-gray-900 text-lg">{internship.title}</h1>
              <p className="text-sm text-gray-500 mt-0.5">{(company as { name?: string })?.name}</p>
              <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-400">
                {internship.location_city && (
                  <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{internship.location_city}</span>
                )}
                <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{internship.duration_weeks} weeks</span>
                <span className={daysLeft <= 3 ? 'text-orange-500 font-medium' : ''}>
                  {daysLeft > 0 ? `${daysLeft} days left` : 'Deadline today'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Already applied */}
          {existing ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center space-y-3">
                <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
                <p className="font-semibold text-gray-800">Application submitted</p>
                <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 capitalize">
                  {(existing.status as string).replace(/_/g, ' ')}
                </Badge>
                <div className="pt-2">
                  <Button asChild variant="outline">
                    <Link href={`/${locale}/student/applications`}>View my applications</Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : !departmentEligible ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-8 text-center space-y-3">
                <p className="font-semibold text-gray-800">Department requirement not met</p>
                <p className="text-sm text-gray-600">
                  {internship.required_department
                    ? `This internship is for ${internship.required_department} students. Your registered department${studentDepartment ? ` is ${studentDepartment}` : ' is not set'}.`
                    : 'Add your department to your student profile before applying.'}
                </p>
                <Button asChild variant="outline">
                  <Link href={`/${locale}/internships/${id}`}>Back to internship details</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ApplyForm
              internshipId={id}
              questions={questions}
              cvUrl={studentProfile?.cv_url ?? null}
              locale={locale}
            />
          )}
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
