'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { computeMatchScore } from '@/lib/matching/matchScore';
import { isDepartmentEligible } from '@/lib/matching/departmentEligibility';
import { applySchema, type ApplyFormData } from '@/lib/validations/applications';

export type { ApplyFormData };

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null };
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  const role = (profile?.role ?? user.user_metadata?.role ?? null) as string | null;
  return { supabase, user, role };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function submitApplication(data: ApplyFormData) {
  const { user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };
  // Only students can apply
  if (role !== 'student') return { error: 'Only students can apply for internships.' };

  const parsed = applySchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const service = createServiceClient();

  // Check for duplicate
  const { data: existing, error: existingError } = await service
    .from('applications')
    .select('id')
    .eq('student_id', user.id)
    .eq('internship_id', parsed.data.internship_id)
    .maybeSingle();
  if (existingError) return { error: existingError.message };
  if (existing) return { error: 'You have already applied for this internship' };

  // Fetch internship and student department before allowing restricted applications.
  const { data: internship, error: internshipError } = await service
    .from('internships')
    .select('status, required_skills, field_id, required_department, location_city, work_mode, duration_weeks, start_date, required_year_min, fields(name_en)')
    .eq('id', parsed.data.internship_id)
    .maybeSingle();
  if (internshipError) return { error: internshipError.message };
  if (!internship || internship.status !== 'open') {
    return { error: 'This internship is not open for applications.' };
  }

  const { data: studentProfile, error: studentProfileError } = await service
    .from('student_profiles')
    .select('skills, department_id, availability, year_of_study')
    .eq('user_id', user.id)
    .maybeSingle();
  if (studentProfileError) return { error: studentProfileError.message };
  if (!studentProfile) {
    return { error: 'Complete your student profile before applying.' };
  }

  let studentDepartment: string | null = null;
  if (studentProfile.department_id) {
    const { data: department, error: departmentError } = await service
      .from('departments')
      .select('name')
      .eq('id', studentProfile.department_id)
      .maybeSingle();
    if (departmentError) return { error: departmentError.message };
    studentDepartment = department?.name ?? null;
  }
  if (!isDepartmentEligible(studentDepartment, internship.required_department)) {
    return {
      error: internship.required_department
        ? `This internship is for ${internship.required_department} students. Your profile department does not match.`
        : 'Add your department to your student profile before applying.',
    };
  }

  const { data: baseProfile, error: baseProfileError } = await service
    .from('profiles')
    .select('city')
    .eq('id', user.id)
    .maybeSingle();
  if (baseProfileError) return { error: baseProfileError.message };

  // Compute match score
  let matchScore = 0;
  if (internship && studentProfile) {
    const fieldRaw = internship.fields;
    const fieldName = Array.isArray(fieldRaw) ? fieldRaw[0]?.name_en : (fieldRaw as { name_en?: string } | null)?.name_en;
    const result = computeMatchScore(
      {
        skills: (studentProfile.skills as Array<{ name: string; level?: string }>) ?? [],
        department: studentDepartment,
        city: baseProfile?.city ?? null,
        availability: studentProfile.availability as { duration_weeks?: number; modes?: string[] } ?? {},
        year_of_study: studentProfile.year_of_study,
      },
      {
        required_skills: (internship.required_skills as Array<{ name: string }>) ?? [],
        field_name: fieldName,
        required_department: internship.required_department,
        location_city: internship.location_city,
        work_mode: internship.work_mode,
        duration_weeks: internship.duration_weeks,
        required_year_min: internship.required_year_min,
      }
    );
    matchScore = result.total;
  }

  // Insert application
  const { data: application, error: appError } = await service
    .from('applications')
    .insert({
      internship_id: parsed.data.internship_id,
      student_id: user.id,
      cover_note: parsed.data.cover_note,
      cv_url: parsed.data.cv_url,
      match_score: matchScore,
      status: 'submitted',
    })
    .select('id')
    .single();

  if (appError) return { error: appError.message };

  // Insert answers
  if (parsed.data.answers?.length && application) {
    const { error: answersError } = await service.from('application_answers').insert(
      parsed.data.answers.map((a) => ({
        application_id: application.id,
        question_id: a.question_id,
        answer: a.answer,
      }))
    );
    if (answersError) {
      return { error: `Application was submitted, but screening answers could not be saved: ${answersError.message}` };
    }
  }

  revalidatePath('/student/applications');
  revalidatePath(`/internships/${parsed.data.internship_id}`);
  return { success: true, applicationId: application?.id };
}

/**
 * Withdraw an application (student only).
 */
export async function withdrawApplication(applicationId: string) {
  const { supabase, user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };
  if (role !== 'student') return { error: 'Only students can withdraw applications.' };

  const { error } = await supabase
    .from('applications')
    .update({ status: 'withdrawn' })
    .eq('id', applicationId)
    .eq('student_id', user.id);

  if (error) return { error: error.message };
  revalidatePath('/student/applications');
  return { success: true };
}

/**
 * Update application status (company action).
 */
export async function updateApplicationStatus(
  applicationId: string,
  status: string,
  note?: string
) {
  const { user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };
  if (role && !['company', 'admin'].includes(role)) {
    return { error: 'Only company accounts can update application status.' };
  }
  if (status === 'interview_scheduled') {
    return { error: 'Use the interview scheduler to set a time and notify the student.' };
  }

  const service = createServiceClient();
  const { data: application, error: applicationError } = await service
    .from('applications')
    .select('id, internship_id, internships(company_id)')
    .eq('id', applicationId)
    .maybeSingle();
  if (applicationError) return { error: applicationError.message };
  if (!application) return { error: 'Application not found.' };

  if (role !== 'admin') {
    const { data: membership, error: membershipError } = await service
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (membershipError) return { error: membershipError.message };

    const internshipJoin = application.internships;
    const internship = Array.isArray(internshipJoin) ? internshipJoin[0] : internshipJoin;
    if (!membership || membership.company_id !== internship?.company_id) {
      return { error: 'You do not have permission to update this application.' };
    }
    const { data: company, error: companyError } = await service
      .from('companies')
      .select('status')
      .eq('id', membership.company_id)
      .maybeSingle();
    if (companyError) return { error: companyError.message };
    if (company?.status !== 'verified') {
      return { error: 'Your company must be verified and active to manage applications.' };
    }
  }

  const { error } = await service
    .from('applications')
    .update({ status })
    .eq('id', applicationId);

  if (error) return { error: error.message };

  // Add a note if provided
  if (note) {
    const { error: noteError } = await service.from('application_notes').insert({
      application_id: applicationId,
      author_id: user.id,
      body: note,
    });
    if (noteError) return { error: `Application status updated, but note could not be saved: ${noteError.message}` };
  }

  revalidatePath('/company/internships');
  revalidatePath('/company/dashboard');
  revalidatePath('/company/applicants');
  revalidatePath('/student/applications');
  revalidatePath('/student/dashboard');
  revalidatePath('/student/interviews');
  return { success: true };
}

/**
 * Add an internal note to an application (company only).
 */
export async function addApplicationNote(applicationId: string, body: string) {
  const { user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };
  if (role && !['company', 'admin'].includes(role)) {
    return { error: 'Only company accounts can add notes.' };
  }

  const service = createServiceClient();
  if (role !== 'admin') {
    const { data: membership, error: membershipError } = await service
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (membershipError) return { error: membershipError.message };

    const { data: application, error: applicationError } = await service
      .from('applications')
      .select('internships(company_id)')
      .eq('id', applicationId)
      .maybeSingle();
    if (applicationError) return { error: applicationError.message };

    const internshipJoin = application?.internships;
    const internship = Array.isArray(internshipJoin) ? internshipJoin[0] : internshipJoin;
    if (!membership || !internship || membership.company_id !== internship.company_id) {
      return { error: 'You do not have permission to add a note to this application.' };
    }
  }

  const { error } = await service.from('application_notes').insert({
    application_id: applicationId,
    author_id: user.id,
    body,
  });

  if (error) return { error: error.message };
  return { success: true };
}
