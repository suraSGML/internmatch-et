import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { SaveInternshipButton } from './SaveInternshipButton';
import { ReportListingButton } from './ReportListingButton';
import { isDepartmentEligible } from '@/lib/matching/departmentEligibility';
import {
  MapPin, Clock, Banknote, Building2, Calendar, BookOpen,
  Globe, Users, CheckCircle2, ShieldCheck, ArrowLeft
} from 'lucide-react';
import { daysUntilDate, formatETB } from '@/lib/utils';

export const dynamic = 'force-dynamic';

export default async function InternshipDetailPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  const supabase = await createClient();

  const { data: internship } = await supabase
    .from('internships')
    .select(`
      *,
      companies(id, name, slug, description, industry, size, city, website, logo_url, status),
      fields(name_en, name_am),
      internship_questions(id, question, is_required, sort_order)
    `)
    .eq('id', id)
    .single();

  if (!internship) notFound();

  const { data: { user } } = await supabase.auth.getUser();
  let isStudent = false;
  if (user) {
    const { data: userProfile, error: userProfileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    if (userProfileError) throw new Error(`Could not check your account role: ${userProfileError.message}`);
    isStudent = userProfile?.role === 'student';
  }

  let studentDepartment: string | null = null;
  if (user) {
    const service = createServiceClient();
    const { data: studentProfile, error: studentProfileError } = await service
      .from('student_profiles')
      .select('department_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (studentProfileError) {
      throw new Error(`Could not load your student department: ${studentProfileError.message}`);
    }
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
  }
  const departmentEligible = isDepartmentEligible(
    studentDepartment,
    internship.required_department as string | null
  );

  // Check if saved
  let isSaved = false;
  if (user) {
    const { data: saved } = await supabase
      .from('saved_internships')
      .select('id')
      .eq('user_id', user.id)
      .eq('internship_id', id)
      .single();
    isSaved = !!saved;
  }

  // Check if already applied
  let hasApplied = false;
  if (user) {
    const { data: app } = await supabase
      .from('applications')
      .select('id, status')
      .eq('student_id', user.id)
      .eq('internship_id', id)
      .single();
    hasApplied = !!app;
  }

  interface CompanyJoin {
    id: string; name: string; slug?: string | null; description?: string | null;
    industry?: string | null; size?: string | null; city?: string | null;
    website?: string | null; logo_url?: string | null; status?: string | null;
  }

  // Supabase returns joins as arrays; normalise to single object
  const companyRaw = internship.companies;
  const company: CompanyJoin | null = Array.isArray(companyRaw)
    ? (companyRaw[0] ?? null)
    : (companyRaw as CompanyJoin | null);

  const fieldRaw = internship.fields;
  const field: { name_en: string } | null = Array.isArray(fieldRaw)
    ? (fieldRaw[0] ?? null)
    : (fieldRaw as { name_en: string } | null);
  const questions = (internship.internship_questions as Array<{ id: string; question: string; is_required: boolean; sort_order: number }> ?? [])
    .sort((a, b) => a.sort_order - b.sort_order);

  const daysLeft = daysUntilDate(internship.deadline);
  const isExpired = daysLeft < 0;
  const skills = (internship.required_skills as Array<{ name: string; level?: string }>) ?? [];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1 bg-gray-50">
        <div className="container mx-auto px-4 py-6 max-w-4xl">
          {/* Back */}
          <Link
            href={`/${locale}/internships`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-indigo-600 mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to internships
          </Link>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main content */}
            <div className="md:col-span-2 space-y-5">
              {/* Header card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-5 pb-5">
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                      <Building2 className="h-7 w-7 text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h1 className="text-xl font-bold text-gray-900">{internship.title}</h1>
                          <Link
                            href={`/${locale}/companies/${company?.slug}`}
                            className="text-sm text-indigo-600 hover:underline font-medium"
                          >
                            {company?.name}
                          </Link>
                          {company?.status === 'verified' && (
                            <span className="ml-2 inline-flex items-center gap-1 text-xs text-green-600">
                              <ShieldCheck className="h-3 w-3" /> Verified
                            </span>
                          )}
                          <p className="mt-1 text-xs text-gray-400">
                            Posted {new Date(internship.created_at).toLocaleDateString('en-ET', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </p>
                        </div>
                        <StatusBadge status={internship.status} />
                      </div>

                      {/* Quick meta */}
                      <div className="flex flex-wrap gap-4 mt-3 text-sm text-gray-600">
                        {internship.location_city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            {internship.location_city}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          {internship.duration_weeks} weeks
                        </span>
                        <span className="capitalize flex items-center gap-1">
                          <Globe className="h-4 w-4 text-gray-400" />
                          {(internship.work_mode as string).replace('_', ' ')}
                        </span>
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-gray-400" />
                          {internship.slots} slot{internship.slots > 1 ? 's' : ''}
                        </span>
                        {internship.is_paid ? (
                          <span className="flex items-center gap-1 text-green-600 font-medium">
                            <Banknote className="h-4 w-4" />
                            {internship.stipend_amount
                              ? `${formatETB(internship.stipend_amount as number)}/month`
                              : 'Paid'}
                          </span>
                        ) : (
                          <span className="text-gray-400">Unpaid</span>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Description */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-5 pb-5 space-y-4">
                  <h2 className="font-semibold text-gray-900">About this internship</h2>
                  <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                    {internship.description}
                  </p>

                  {internship.responsibilities && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Responsibilities</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{internship.responsibilities as string}</p>
                      </div>
                    </>
                  )}

                  {internship.requirements && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Requirements</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{internship.requirements as string}</p>
                      </div>
                    </>
                  )}

                  {skills.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Required Skills</h3>
                        <div className="flex flex-wrap gap-2">
                          {skills.map((s) => (
                            <Badge
                              key={s.name}
                              variant="outline"
                              className="bg-indigo-50 text-indigo-700 border-indigo-100"
                            >
                              {s.name}
                              {s.level && <span className="ml-1 opacity-60 text-xs">({s.level})</span>}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {internship.benefits && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="font-medium text-gray-900 mb-2">Benefits</h3>
                        <p className="text-sm text-gray-600">{internship.benefits as string}</p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>

              {/* Screening questions preview */}
              {questions.length > 0 && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-5 pb-5">
                    <h2 className="font-semibold text-gray-900 mb-3">
                      Screening Questions ({questions.length})
                    </h2>
                    <div className="space-y-2">
                      {questions.map((q, i) => (
                        <div key={q.id} className="flex gap-3 text-sm">
                          <span className="text-gray-400 shrink-0">{i + 1}.</span>
                          <span className="text-gray-700">
                            {q.question}
                            {q.is_required && (
                              <span className="text-red-400 ml-1">*</span>
                            )}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Apply card */}
              <Card className="border-0 shadow-sm sticky top-20">
                <CardContent className="pt-5 pb-5 space-y-4">
                  {/* Deadline */}
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-500">Application deadline</p>
                      <p className={`text-sm font-medium ${isExpired ? 'text-red-500' : daysLeft <= 3 ? 'text-orange-500' : 'text-gray-800'}`}>
                        {new Date(internship.deadline).toLocaleDateString('en-ET', { day: 'numeric', month: 'long', year: 'numeric' })}
                        {!isExpired && (
                          <span className="ml-1 text-xs font-normal">
                            ({daysLeft === 0 ? 'today!' : `${daysLeft}d left`})
                          </span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* University approval */}
                  {internship.requires_university_approval && (
                    <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 rounded-lg p-2">
                      <BookOpen className="h-4 w-4 shrink-0" />
                      University coordinator approval required
                    </div>
                  )}

                  {/* CTA */}
                  {hasApplied ? (
                    <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg p-3">
                      <CheckCircle2 className="h-4 w-4 shrink-0" />
                      You have applied
                    </div>
                  ) : user && internship.required_department && !departmentEligible ? (
                    <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      This opportunity is for {internship.required_department} students.
                      {studentDepartment
                        ? ` Your registered department is ${studentDepartment}.`
                        : ' Add a department to your student profile to check eligibility.'}
                    </div>
                  ) : internship.status !== 'open' || isExpired ? (
                    <Button disabled className="w-full">Applications closed</Button>
                  ) : user ? (
                    <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700">
                      <Link href={`/${locale}/internships/${id}/apply`}>
                        Apply Now
                      </Link>
                    </Button>
                  ) : (
                    <Button asChild className="w-full bg-indigo-600 hover:bg-indigo-700">
                      <Link href={`/${locale}/login?next=/${locale}/internships/${id}`}>
                        Sign in to Apply
                      </Link>
                    </Button>
                  )}

                  {/* Save button */}
                  {user && (
                    <SaveInternshipButton
                      internshipId={id}
                      initialSaved={isSaved}
                    />
                  )}
                  {isStudent && <ReportListingButton internshipId={id} />}
                </CardContent>
              </Card>

              {/* Company card */}
              <Card className="border-0 shadow-sm">
                <CardContent className="pt-4 pb-4 space-y-3">
                  <h3 className="font-semibold text-sm text-gray-700">About the company</h3>
                  <div className="flex items-center gap-2">
                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-medium text-sm">{company?.name}</p>
                      {company?.industry && (
                        <p className="text-xs text-gray-500">{company.industry}</p>
                      )}
                    </div>
                  </div>
                  {company?.city && (
                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />{company.city}
                    </p>
                  )}
                  <Link
                    href={`/${locale}/companies/${company?.slug}`}
                    className="text-xs text-indigo-600 hover:underline"
                  >
                    View company profile →
                  </Link>
                </CardContent>
              </Card>

              {/* Field */}
              {field && (
                <Card className="border-0 shadow-sm">
                  <CardContent className="pt-3 pb-3">
                    <p className="text-xs text-gray-500 mb-1">Field</p>
                    <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-100">
                      {field.name_en}
                    </Badge>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
