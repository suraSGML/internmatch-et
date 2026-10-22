'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import {
  baseProfileSchema,
  studentProfileSchema,
  companyProfileSchema,
} from '@/lib/validations/profile';
import { computeProfileCompleteness } from '@/lib/profileCompleteness';

// ─── Auth helpers ─────────────────────────────────────────────────────────────

async function getAuthUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, role: null };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  // Prefer DB role; fall back to user_metadata so onboarding works immediately
  // after signUp before any DB propagation delay
  const role = (profile?.role ?? user.user_metadata?.role ?? null) as string | null;
  return { supabase, user, role };
}

// ─── Base profile ─────────────────────────────────────────────────────────────

export async function getDepartmentsByUniversity(universityId: string) {
  if (!universityId) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from('departments')
    .select('id, name')
    .eq('university_id', universityId)
    .order('name');
  return data ?? [];
}

export async function updateBaseProfile(formData: FormData) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = baseProfileSchema.safeParse({
    full_name: formData.get('full_name'),
    phone: formData.get('phone'),
    city: formData.get('city'),
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { error } = await supabase
    .from('profiles')
    .update(parsed.data)
    .eq('id', user.id);

  if (error) return { error: error.message };

  // Recompute completeness if student
  const service = createServiceClient();
  const { data: sp } = await service
    .from('student_profiles')
    .select('bio, skills, university_id, department_id, year_of_study, cv_url, availability')
    .eq('user_id', user.id)
    .maybeSingle();

  if (sp) {
    const { percentage: pct } = computeProfileCompleteness({
      fullName: parsed.data.full_name,
      phone: parsed.data.phone,
      city: parsed.data.city,
      avatarUrl: (user.user_metadata?.avatar_url as string) || undefined,
      bio: sp.bio,
      skills: sp.skills as Array<unknown>,
      universityId: sp.university_id,
      departmentId: sp.department_id,
      yearOfStudy: sp.year_of_study,
      cvUrl: sp.cv_url,
    });
    await service
      .from('student_profiles')
      .update({ profile_complete_pct: pct })
      .eq('user_id', user.id);
  }

  revalidatePath('/student/profile');
  revalidatePath('/student/dashboard');
  revalidatePath('/company/profile');
  return { success: true };
}

// ─── Student profile ──────────────────────────────────────────────────────────

/**
 * Upsert student profile.
 * Uses service role so it works even if the session cookie isn't fully
 * established yet (e.g. immediately after email-confirmed signup).
 * The userId is verified via the anon client first to prevent spoofing.
 */
export async function updateStudentProfile(formData: FormData) {
  // 1. Verify session with anon client
  const { user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated. Please log in and try again.' };
  if (role && !['student', 'admin'].includes(role)) {
    return { error: 'Only student accounts can update a student profile.' };
  }

  const service = createServiceClient();
  const universityId = (formData.get('university_id') as string) || undefined;
  const departmentId = (formData.get('department_id') as string) || undefined;
  if (formData.has('department_name')) {
    return { error: 'Department must be selected from your university’s department list.' };
  }
  const rawYear = formData.get('year_of_study');
  const yearOfStudy = rawYear ? Number(rawYear) : undefined;

  const parsed = studentProfileSchema.safeParse({
    bio: formData.get('bio') || undefined,
    university_id: universityId,
    department_id: departmentId,
    student_number: formData.get('student_number') || undefined,
    year_of_study: yearOfStudy,
    expected_graduation: formData.get('expected_graduation') || undefined,
    visibility: formData.get('visibility') || 'all_verified',
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  // Fetch current profile & student profile
  const { data: currentSp, error: currentSpError } = await service
    .from('student_profiles')
    .select('skills, availability, cv_url, university_id, department_id, year_of_study, bio')
    .eq('user_id', user.id)
    .maybeSingle();
  if (currentSpError) return { error: currentSpError.message };

  if (role === 'student') {
    if (
      currentSp?.university_id &&
      parsed.data.university_id !== undefined &&
      parsed.data.university_id !== currentSp.university_id
    ) {
      return { error: 'University is fixed after it has been saved. Contact your university coordinator to request a correction.' };
    }
    if (
      currentSp?.department_id &&
      parsed.data.department_id !== undefined &&
      parsed.data.department_id !== currentSp.department_id
    ) {
      return { error: 'Department is fixed after it has been saved. Contact your university coordinator to request a correction.' };
    }
    if (
      currentSp?.year_of_study != null &&
      parsed.data.year_of_study !== undefined &&
      parsed.data.year_of_study !== currentSp.year_of_study
    ) {
      return { error: 'Year of study is fixed after it has been saved. Contact your university coordinator to request a correction.' };
    }
  }

  const { data: currentProfile } = await service
    .from('profiles')
    .select('full_name, phone, city, avatar_url')
    .eq('id', user.id)
    .maybeSingle();

  const finalBio = parsed.data.bio ?? currentSp?.bio;
  const finalUniId = parsed.data.university_id ?? currentSp?.university_id;
  const finalDeptId = parsed.data.department_id ?? currentSp?.department_id;
  const finalYear = parsed.data.year_of_study ?? currentSp?.year_of_study;

  if (finalDeptId) {
    if (!finalUniId) {
      return { error: 'Select a university before selecting a department.' };
    }

    const { data: department, error: departmentError } = await service
      .from('departments')
      .select('id')
      .eq('id', finalDeptId)
      .eq('university_id', finalUniId)
      .maybeSingle();
    if (departmentError) return { error: departmentError.message };
    if (!department) {
      return { error: 'Select a department listed for your selected university.' };
    }
  }

  const { percentage: pct } = computeProfileCompleteness({
    fullName: currentProfile?.full_name,
    phone: currentProfile?.phone,
    city: currentProfile?.city,
    avatarUrl: currentProfile?.avatar_url,
    bio: finalBio,
    skills: currentSp?.skills as Array<unknown>,
    universityId: finalUniId,
    departmentId: finalDeptId,
    yearOfStudy: finalYear,
    cvUrl: currentSp?.cv_url,
  });

  const payload: Record<string, unknown> = {
    user_id: user.id,
    profile_complete_pct: pct,
  };
  if (parsed.data.bio !== undefined) payload.bio = parsed.data.bio;
  if (parsed.data.university_id !== undefined) payload.university_id = parsed.data.university_id;
  if (parsed.data.department_id !== undefined) payload.department_id = parsed.data.department_id;
  if (parsed.data.student_number !== undefined) payload.student_number = parsed.data.student_number;
  if (parsed.data.year_of_study !== undefined) payload.year_of_study = parsed.data.year_of_study;
  if (parsed.data.expected_graduation !== undefined) payload.expected_graduation = parsed.data.expected_graduation;
  if (parsed.data.visibility !== undefined) payload.visibility = parsed.data.visibility;

  // 2. Use service role to upsert (bypasses RLS for onboarding)
  const { error } = await service
    .from('student_profiles')
    .upsert(payload, { onConflict: 'user_id' });

  if (error) return { error: error.message };
  revalidatePath('/student/profile');
  revalidatePath('/student/dashboard');
  return { success: true };
}

export async function updateStudentSkills(
  userId: string,
  skills: Array<{ name: string; level: string }>
) {
  const { user, role } = await getAuthUser();
  if (!user || user.id !== userId) return { error: 'Not authorized' };
  if (role && !['student', 'admin'].includes(role)) return { error: 'Not authorized' };

  const service = createServiceClient();

  // Recompute completeness
  const { data: currentSp } = await service
    .from('student_profiles')
    .select('bio, university_id, department_id, year_of_study, availability, cv_url')
    .eq('user_id', userId)
    .maybeSingle();

  const { data: currentProfile } = await service
    .from('profiles')
    .select('full_name, phone, city, avatar_url')
    .eq('id', userId)
    .maybeSingle();

  const { percentage: pct } = computeProfileCompleteness({
    fullName: currentProfile?.full_name,
    phone: currentProfile?.phone,
    city: currentProfile?.city,
    avatarUrl: currentProfile?.avatar_url,
    bio: currentSp?.bio,
    skills,
    universityId: currentSp?.university_id,
    departmentId: currentSp?.department_id,
    yearOfStudy: currentSp?.year_of_study,
    cvUrl: currentSp?.cv_url,
  });

  const { error } = await service
    .from('student_profiles')
    .update({ skills, profile_complete_pct: pct })
    .eq('user_id', userId);

  if (error) return { error: error.message };
  revalidatePath('/student/profile');
  revalidatePath('/student/dashboard');
  return { success: true };
}

export async function updateStudentAvailability(
  userId: string,
  availability: { start_date?: string; duration_weeks?: number; modes?: string[] }
) {
  const { user, role } = await getAuthUser();
  if (!user || user.id !== userId) return { error: 'Not authorized' };
  if (role && !['student', 'admin'].includes(role)) return { error: 'Not authorized' };

  const service = createServiceClient();
  const { error } = await service
    .from('student_profiles')
    .update({ availability })
    .eq('user_id', userId);

  if (error) return { error: error.message };
  revalidatePath('/student/profile');
  return { success: true };
}

// ─── Company profile ──────────────────────────────────────────────────────────

export async function updateCompanyProfile(companyId: string, formData: FormData) {
  const { supabase, user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };
  if (role && !['company', 'admin'].includes(role)) {
    return { error: 'Only company accounts can update a company profile.' };
  }

  const parsed = companyProfileSchema.safeParse({
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    industry: formData.get('industry') || undefined,
    size: formData.get('size') || undefined,
    city: formData.get('city') || undefined,
    address: formData.get('address') || undefined,
    website: formData.get('website') || undefined,
    contact_person: formData.get('contact_person') || undefined,
    registration_number: formData.get('registration_number') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  // Verify the user is a member of this company
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .eq('company_id', companyId)
    .single();

  if (!membership && role !== 'admin') {
    return { error: 'You do not have permission to edit this company.' };
  }
  if (membership && role !== 'admin') {
    const service = createServiceClient();
    const { data: company, error: companyError } = await service
      .from('companies')
      .select('status')
      .eq('id', companyId)
      .maybeSingle();
    if (companyError) return { error: companyError.message };
    if (company?.status !== 'verified') {
      return { error: 'Your company must be verified and active to edit its profile.' };
    }
  }

  const { error } = await supabase
    .from('companies')
    .update(parsed.data)
    .eq('id', companyId);

  if (error) return { error: error.message };
  revalidatePath('/company/profile');
  return { success: true };
}

/**
 * Create company during onboarding. Uses service role to bypass RLS.
 */
export async function createCompany(formData: FormData) {
  const { user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated. Please log in and try again.' };
  if (role && !['company', 'admin'].includes(role)) {
    return { error: 'Only company accounts can create a company.' };
  }

  const parsed = companyProfileSchema.safeParse({
    name: formData.get('name') || undefined,
    description: formData.get('description') || undefined,
    industry: formData.get('industry') || undefined,
    size: formData.get('size') || undefined,
    city: formData.get('city') || undefined,
    address: formData.get('address') || undefined,
    website: formData.get('website') || undefined,
    contact_person: formData.get('contact_person') || undefined,
    registration_number: formData.get('registration_number') || undefined,
  });
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const service = createServiceClient();

  // Check if user already has a company
  const { data: existing } = await service
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) return { error: 'You already have a company registered.' };

  const { data: company, error: companyError } = await service
    .from('companies')
    .insert({ ...parsed.data, owner_id: user.id })
    .select('id')
    .single();

  if (companyError) return { error: companyError.message };

  const { error: memberError } = await service
    .from('company_members')
    .insert({ company_id: company.id, user_id: user.id, member_role: 'owner' });

  if (memberError) return { error: memberError.message };

  revalidatePath('/company/profile');
  return { success: true, companyId: company.id };
}

// ─── Admin actions ────────────────────────────────────────────────────────────

export async function verifyCompany(
  companyId: string,
  action: 'verify' | 'reject',
  note?: string
) {
  const { user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };
  if (role !== 'admin') return { error: 'Admin access required' };
  const trimmedNote = note?.trim();
  if (action === 'reject' && (!trimmedNote || trimmedNote.length > 1000)) {
    return { error: 'Provide a rejection reason between 1 and 1000 characters.' };
  }

  const service = createServiceClient();
  const status = action === 'verify' ? 'verified' : 'rejected';

  const { data: updatedCompany, error } = await service
    .from('companies')
    .update({
      status,
      verified_at: action === 'verify' ? new Date().toISOString() : null,
      review_note: action === 'reject' ? trimmedNote : null,
    })
    .eq('id', companyId)
    .in('status', action === 'reject' ? ['pending', 'verified', 'rejected'] : ['pending', 'rejected'])
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updatedCompany) return { error: 'Company status changed before your review was saved. Refresh and try again.' };

  // Write audit log
  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: `company.${status}`,
    target_type: 'company',
    target_id: companyId,
    details: { note: action === 'reject' ? trimmedNote : null },
  });

  revalidatePath('/admin/companies');
  revalidatePath('/admin');
  revalidatePath('/company');
  revalidatePath('/company/profile');
  return { success: true };
}

export async function verifyUniversity(
  universityId: string,
  action: 'verify' | 'reject'
) {
  const { user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };
  if (role !== 'admin') return { error: 'Admin access required' };

  const service = createServiceClient();
  const status = action === 'verify' ? 'verified' : 'rejected';

  const { error } = await service
    .from('universities')
    .update({ status })
    .eq('id', universityId);

  if (error) return { error: error.message };

  // Write audit log
  await service.from('audit_logs').insert({
    actor_id: user.id,
    action: `university.${status}`,
    target_type: 'university',
    target_id: universityId,
    details: {},
  });

  revalidatePath('/admin/universities');
  revalidatePath('/admin');
  return { success: true };
}

// ─── Avatar Photo Management ──────────────────────────────────────────────────

export async function uploadAvatar(formData: FormData) {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('avatar') as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'No image file provided' };
  }

  if (file.size > 5 * 1024 * 1024) {
    return { error: 'Photo must be under 5MB' };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (!allowedTypes.includes(file.type)) {
    return { error: 'Please upload a valid image (JPG, PNG, WEBP, or GIF)' };
  }

  const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
  const filePath = `${user.id}/avatar_${Date.now()}.${ext}`;

  const service = createServiceClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await service.storage
    .from('avatars')
    .upload(filePath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    console.error('Avatar upload error:', uploadError);
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = service.storage.from('avatars').getPublicUrl(filePath);

  // Update profiles table
  const { error: updateError } = await service
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  // Also update auth user metadata so session & layouts immediately have it
  await supabase.auth.updateUser({
    data: { avatar_url: publicUrl },
  });

  // Recompute completeness if student
  const { data: sp } = await service
    .from('student_profiles')
    .select('bio, skills, university_id, department_id, year_of_study, cv_url')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: prof } = await service
    .from('profiles')
    .select('full_name, phone, city')
    .eq('id', user.id)
    .maybeSingle();

  if (sp) {
    const { percentage: pct } = computeProfileCompleteness({
      fullName: prof?.full_name,
      phone: prof?.phone,
      city: prof?.city,
      avatarUrl: publicUrl,
      bio: sp.bio,
      skills: sp.skills as Array<unknown>,
      universityId: sp.university_id,
      departmentId: sp.department_id,
      yearOfStudy: sp.year_of_study,
      cvUrl: sp.cv_url,
    });

    await service
      .from('student_profiles')
      .update({ profile_complete_pct: pct })
      .eq('user_id', user.id);
  }

  revalidatePath('/student/profile');
  revalidatePath('/student/dashboard');
  revalidatePath('/student/cv');
  revalidatePath('/company/profile');

  return { success: true, avatarUrl: publicUrl };
}

export async function removeAvatar() {
  const { supabase, user } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };

  const service = createServiceClient();
  const { error: updateError } = await service
    .from('profiles')
    .update({ avatar_url: null })
    .eq('id', user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  await supabase.auth.updateUser({
    data: { avatar_url: null },
  });

  // Recompute completeness if student
  const { data: sp } = await service
    .from('student_profiles')
    .select('bio, skills, university_id, department_id, year_of_study, cv_url')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: prof } = await service
    .from('profiles')
    .select('full_name, phone, city')
    .eq('id', user.id)
    .maybeSingle();

  if (sp) {
    const { percentage: pct } = computeProfileCompleteness({
      fullName: prof?.full_name,
      phone: prof?.phone,
      city: prof?.city,
      avatarUrl: null,
      bio: sp.bio,
      skills: sp.skills as Array<unknown>,
      universityId: sp.university_id,
      departmentId: sp.department_id,
      yearOfStudy: sp.year_of_study,
      cvUrl: sp.cv_url,
    });

    await service
      .from('student_profiles')
      .update({ profile_complete_pct: pct })
      .eq('user_id', user.id);
  }

  revalidatePath('/student/profile');
  revalidatePath('/student/dashboard');
  revalidatePath('/student/cv');
  revalidatePath('/company/profile');

  return { success: true };
}

// ─── Student CV Upload ────────────────────────────────────────────────────────

export async function uploadStudentCV(formData: FormData) {
  const { user } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };

  const file = formData.get('cv') as File | null;
  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'Please select a PDF file' };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: 'CV file must be under 10MB' };
  }

  if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
    return { error: 'Only PDF files are supported for CV upload' };
  }

  const service = createServiceClient();
  const filePath = `${user.id}/cv_${Date.now()}.pdf`;
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await service.storage
    .from('cvs')
    .upload(filePath, buffer, {
      contentType: 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('CV upload error:', uploadError);
    return { error: uploadError.message };
  }

  const {
    data: { publicUrl },
  } = service.storage.from('cvs').getPublicUrl(filePath);

  const { error: updateError } = await service
    .from('student_profiles')
    .update({ cv_url: publicUrl })
    .eq('user_id', user.id);

  if (updateError) {
    return { error: updateError.message };
  }

  revalidatePath('/student/cv');
  revalidatePath('/student/profile');
  return { success: true, cvUrl: publicUrl };
}

export async function removeStudentCV() {
  const { user } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };

  const service = createServiceClient();
  const { error } = await service
    .from('student_profiles')
    .update({ cv_url: null })
    .eq('user_id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/student/cv');
  revalidatePath('/student/profile');
  return { success: true };
}
