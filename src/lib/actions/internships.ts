'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { internshipSchema, type InternshipFormData } from '@/lib/validations/internships';
import { isInternshipFieldAllowed } from '@/lib/matching/industryEligibility';

export type { InternshipFormData };

// ─── Role guard helper ────────────────────────────────────────────────────────

async function requireCompany() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role ?? user.user_metadata?.role ?? null) as string | null;

  if (!role || !['company', 'admin'].includes(role)) {
    return { supabase: null, user: null, error: 'Only company accounts can manage internships' };
  }

  return { supabase, user, error: null };
}

// ─── Actions ──────────────────────────────────────────────────────────────────

export async function createInternship(data: InternshipFormData) {
  const { supabase, user, error: authError } = await requireCompany();
  if (authError || !supabase || !user) return { error: authError };

  const parsed = internshipSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  // Get user's company membership
  const { data: membership, error: membershipError } = await supabase
    .from('company_members')
    .select('company_id, companies(status, industry)')
    .eq('user_id', user.id)
    .single();

  if (membershipError) return { error: membershipError.message };
  if (!membership) return { error: 'No company found. Complete company onboarding first.' };

  // Only verified companies can post internships (unless admin)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const company = membership.companies as unknown as
    | { status: string; industry?: string | null }
    | { status: string; industry?: string | null }[]
    | null;
  const companyRecord = Array.isArray(company) ? company[0] : company;
  const companyStatus = companyRecord?.status;
  if (profile?.role !== 'admin' && companyStatus !== 'verified') {
    return { error: 'Your company must be verified before posting internships.' };
  }

  if (parsed.data.status === 'open') {
    if (!parsed.data.field_id) {
      return { error: 'Select an internship field before publishing.' };
    }
    const { data: field, error: fieldError } = await supabase
      .from('fields')
      .select('name_en')
      .eq('id', parsed.data.field_id)
      .maybeSingle();
    if (fieldError) return { error: fieldError.message };
    if (!field || !isInternshipFieldAllowed(companyRecord?.industry, field.name_en)) {
      return { error: 'Choose an internship field related to your company industry. Update your company industry if it is missing or incorrect.' };
    }
  }

  const { data: internship, error } = await supabase
    .from('internships')
    .insert({
      ...parsed.data,
      company_id: membership.company_id,
      posted_by: user.id,
    })
    .select('id')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/company/internships');
  return { success: true, id: internship.id };
}

export async function updateInternship(id: string, data: InternshipFormData) {
  const { supabase, user, error: authError } = await requireCompany();
  if (authError || !supabase || !user) return { error: authError };

  const parsed = internshipSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  // Verify ownership — the internship must belong to the user's company
  const { data: membership, error: membershipError } = await supabase
    .from('company_members')
    .select('company_id, companies(industry, status)')
    .eq('user_id', user.id)
    .single();

  if (membershipError) return { error: membershipError.message };
  if (!membership) return { error: 'No company found' };

  const companyJoin = membership.companies as
    | { status?: string; industry?: string | null }
    | Array<{ status?: string; industry?: string | null }>
    | null;
  const companyRecord = Array.isArray(companyJoin) ? companyJoin[0] : companyJoin;
  if (companyRecord?.status !== 'verified') {
    return { error: 'Your company must be verified and active to manage internships.' };
  }

  const { data: existing } = await supabase
    .from('internships')
    .select('company_id')
    .eq('id', id)
    .single();

  if (!existing || existing.company_id !== membership.company_id) {
    return { error: 'You do not have permission to edit this internship' };
  }

  if (parsed.data.status === 'open') {
    if (!parsed.data.field_id) {
      return { error: 'Select an internship field before publishing.' };
    }
    const { data: field, error: fieldError } = await supabase
      .from('fields')
      .select('name_en')
      .eq('id', parsed.data.field_id)
      .maybeSingle();
    if (fieldError) return { error: fieldError.message };
    const companyIndustry = companyRecord?.industry;
    if (!field || !isInternshipFieldAllowed(companyIndustry, field.name_en)) {
      return { error: 'Choose an internship field related to your company industry. Update your company industry if it is missing or incorrect.' };
    }
  }

  const { error } = await supabase
    .from('internships')
    .update(parsed.data)
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/company/internships');
  revalidatePath(`/internships/${id}`);
  return { success: true };
}

export async function updateInternshipSkills(
  id: string,
  skills: Array<{ name: string; level?: string }>
) {
  const { supabase, user, error: authError } = await requireCompany();
  if (authError || !supabase || !user) return { error: authError };

  const { data: membership, error: membershipError } = await supabase
    .from('company_members')
    .select('company_id, companies(status)')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) return { error: membershipError.message };
  const companyJoin = membership?.companies;
  const company = Array.isArray(companyJoin) ? companyJoin[0] : companyJoin;
  if (!membership || company?.status !== 'verified') {
    return { error: 'Your company must be verified and active to manage internships.' };
  }
  const { data: existing, error: internshipError } = await supabase
    .from('internships')
    .select('company_id')
    .eq('id', id)
    .maybeSingle();
  if (internshipError) return { error: internshipError.message };
  if (!existing || existing.company_id !== membership.company_id) {
    return { error: 'You do not have permission to edit this internship.' };
  }

  const { error } = await supabase
    .from('internships')
    .update({ required_skills: skills })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath(`/company/internships/${id}`);
  return { success: true };
}

export async function saveInternship(internshipId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: existing } = await supabase
    .from('saved_internships')
    .select('id')
    .eq('user_id', user.id)
    .eq('internship_id', internshipId)
    .single();

  if (existing) {
    await supabase.from('saved_internships').delete().eq('id', existing.id);
    return { saved: false };
  } else {
    await supabase
      .from('saved_internships')
      .insert({ user_id: user.id, internship_id: internshipId });
    return { saved: true };
  }
}

export async function deleteInternship(id: string) {
  const { supabase, user, error: authError } = await requireCompany();
  if (authError || !supabase || !user) return { error: authError };

  // Verify ownership
  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id, companies(status)')
    .eq('user_id', user.id)
    .single();

  if (!membership) return { error: 'No company found' };
  const companyJoin = membership.companies;
  const company = Array.isArray(companyJoin) ? companyJoin[0] : companyJoin;
  if (company?.status !== 'verified') {
    return { error: 'Your company must be verified and active to manage internships.' };
  }

  const { data: existing } = await supabase
    .from('internships')
    .select('company_id')
    .eq('id', id)
    .single();

  if (!existing || existing.company_id !== membership.company_id) {
    return { error: 'You do not have permission to delete this internship' };
  }

  const { error } = await supabase
    .from('internships')
    .update({ status: 'cancelled' })
    .eq('id', id);

  if (error) return { error: error.message };
  revalidatePath('/company/internships');
  return { success: true };
}
