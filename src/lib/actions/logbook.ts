'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  logbookEntrySchema,
  supervisorReviewSchema,
  evaluationSchema,
  issueCertificateSchema,
  type LogbookEntryData,
  type SupervisorReviewData,
  type EvaluationData,
} from '@/lib/validations/logbook';

export type { LogbookEntryData, SupervisorReviewData, EvaluationData };

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

// ─── Logbook actions ──────────────────────────────────────────────────────────

export async function saveLogbookEntry(
  data: z.infer<typeof logbookEntrySchema>,
  submitNow = false
) {
  const { supabase, user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };
  if (role !== 'student') return { error: 'Only students can submit logbook entries.' };

  const parsed = logbookEntrySchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  // Check if entry for this week already exists
  const { data: existing } = await supabase
    .from('logbook_entries')
    .select('id, status')
    .eq('placement_id', parsed.data.placement_id)
    .eq('week_start', parsed.data.week_start)
    .single();

  const payload = {
    ...parsed.data,
    status: submitNow ? 'submitted' : 'draft',
  };

  if (existing) {
    // Don't allow editing an approved entry
    if (existing.status === 'approved') {
      return { error: 'This entry has already been approved and cannot be edited.' };
    }
    const { error } = await supabase
      .from('logbook_entries')
      .update(payload)
      .eq('id', existing.id);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase
      .from('logbook_entries')
      .insert(payload);
    if (error) return { error: error.message };
  }

  revalidatePath('/student/logbook');
  return { success: true };
}

export async function supervisorReviewEntry(data: z.infer<typeof supervisorReviewSchema>) {
  const { supabase, user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };
  if (role && !['company', 'admin'].includes(role)) {
    return { error: 'Only company supervisors can review logbook entries.' };
  }

  const parsed = supervisorReviewSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const updateData: Record<string, unknown> = {
    status: parsed.data.action,
    supervisor_comment: parsed.data.comment ?? null,
  };
  if (parsed.data.action === 'approved') {
    updateData.approved_at = new Date().toISOString();
    updateData.approved_by = user.id;
  }

  const { error } = await supabase
    .from('logbook_entries')
    .update(updateData)
    .eq('id', parsed.data.entry_id);

  if (error) return { error: error.message };
  revalidatePath('/company/interns');
  revalidatePath('/student/logbook');
  return { success: true };
}

// ─── Evaluation actions ───────────────────────────────────────────────────────

export async function submitEvaluation(data: z.infer<typeof evaluationSchema>) {
  const { supabase, user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };
  if (role && !['company', 'admin'].includes(role)) {
    return { error: 'Only company supervisors can submit evaluations.' };
  }

  const parsed = evaluationSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { error } = await supabase
    .from('evaluations')
    .upsert(
      {
        placement_id: parsed.data.placement_id,
        type: parsed.data.type,
        ratings: parsed.data.ratings,
        comments: parsed.data.comments ?? null,
        recommendation: parsed.data.recommendation ?? null,
        submitted_by: user.id,
        visible_to_student: parsed.data.visible_to_student,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'placement_id,type' }
    );

  if (error) return { error: error.message };
  revalidatePath('/company/interns');
  return { success: true };
}

// ─── Certificate actions ──────────────────────────────────────────────────────

export async function issueCertificate(data: z.infer<typeof issueCertificateSchema>) {
  const { supabase, user, role } = await getAuthUser();
  if (!user) return { error: 'Not authenticated' };
  if (role !== 'company') {
    return { error: 'Only company accounts can issue certificates.' };
  }

  const parsed = issueCertificateSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { data: membership, error: membershipError } = await supabase
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) return { error: membershipError.message };
  if (!membership) return { error: 'Your account is not linked to a company.' };

  const service = createServiceClient();
  const { data: placement, error: placementError } = await service
    .from('placements')
    .select(`
      id, start_date, end_date, status, company_id,
      profiles!placements_student_id_fkey(full_name),
      companies(name),
      applications(internships(title))
    `)
    .eq('id', parsed.data.placement_id)
    .eq('company_id', membership.company_id)
    .maybeSingle();
  if (placementError) return { error: placementError.message };
  if (!placement) return { error: 'Placement not found for your company.' };
  if (placement.status !== 'completed') {
    return { error: 'The placement must be marked completed before issuing a certificate.' };
  }

  const { data: finalEvaluation, error: evaluationError } = await service
    .from('evaluations')
    .select('id')
    .eq('placement_id', placement.id)
    .eq('type', 'final')
    .maybeSingle();
  if (evaluationError) return { error: evaluationError.message };
  if (!finalEvaluation) return { error: 'Submit the final evaluation before issuing a certificate.' };

  const { data: existing, error: existingError } = await service
    .from('certificates')
    .select('id, public_code, revoked_at')
    .eq('placement_id', parsed.data.placement_id)
    .maybeSingle();
  if (existingError) return { error: existingError.message };

  if (existing?.revoked_at) {
    return { error: 'This certificate was revoked and cannot be reissued.' };
  }
  if (existing) {
    return { success: true, public_code: existing.public_code, existing: true };
  }

  const profile = Array.isArray(placement.profiles) ? placement.profiles[0] : placement.profiles as { full_name?: string } | null;
  const company = Array.isArray(placement.companies) ? placement.companies[0] : placement.companies as { name?: string } | null;
  const app = Array.isArray(placement.applications) ? placement.applications[0] : placement.applications as Record<string, unknown> | null;
  const internship = app
    ? (Array.isArray((app as Record<string, unknown>).internships)
        ? ((app as Record<string, unknown>).internships as Array<{ title?: string }>)[0]
        : (app as Record<string, unknown>).internships as { title?: string } | null)
    : null;

  // Get total approved logbook hours
  const { data: logbook } = await supabase.rpc('get_logbook_summary', {
    p_placement_id: parsed.data.placement_id,
  });
  const totalHours = (logbook as { total_hours?: number } | null)?.total_hours ?? 0;

  const certData = {
    student_name: (profile as { full_name?: string } | null)?.full_name ?? '',
    company_name: (company as { name?: string } | null)?.name ?? '',
    role: (internship as { title?: string } | null)?.title ?? '',
    start_date: placement.start_date,
    end_date: placement.end_date,
    total_hours: totalHours,
  };

  const { data: cert, error } = await supabase
    .from('certificates')
    .insert({
      placement_id: parsed.data.placement_id,
      issued_by: user.id,
      data: certData,
    })
    .select('id, public_code')
    .single();

  if (error) {
    if (error.code === '23505') {
      const { data: concurrentCertificate, error: lookupError } = await service
        .from('certificates')
        .select('public_code, revoked_at')
        .eq('placement_id', placement.id)
        .maybeSingle();
      if (lookupError) return { error: lookupError.message };
      if (concurrentCertificate?.revoked_at) {
        return { error: 'This certificate was revoked and cannot be reissued.' };
      }
      if (concurrentCertificate) {
        return { success: true, public_code: concurrentCertificate.public_code, existing: true };
      }
    }
    return { error: error.message };
  }
  revalidatePath('/company/interns');
  revalidatePath(`/company/interns/${placement.id}`);
  revalidatePath('/student/certificates');
  return { success: true, public_code: cert.public_code };
}
