'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ─── Auth guard ───────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, service: null, user: null, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (profile?.role !== 'admin') return { supabase: null, service: null, user: null, error: 'Forbidden' };

  const service = createServiceClient();
  return { supabase, service, user, error: null };
}

// ─── Audit helper ─────────────────────────────────────────────────────────────

async function audit(
  service: ReturnType<typeof createServiceClient>,
  actorId: string,
  action: string,
  targetType?: string,
  targetId?: string,
  details?: Record<string, unknown>
) {
  await service.from('audit_logs').insert({
    actor_id: actorId,
    action,
    target_type: targetType ?? null,
    target_id: targetId ?? null,
    details: details ?? {},
  });
}

// ─── User management ──────────────────────────────────────────────────────────

export async function toggleUserSuspension(userId: string, suspend: boolean) {
  const { supabase, service, user, error: authError } = await requireAdmin();
  if (authError || !supabase || !service || !user) return { error: authError };

  if (user.id === userId) return { error: 'You cannot suspend your own admin account.' };

  const { data: target, error: targetError } = await service
    .from('profiles')
    .select('role, is_suspended')
    .eq('id', userId)
    .maybeSingle();
  if (targetError) return { error: targetError.message };
  if (!target) return { error: 'User not found.' };
  if (target.role === 'admin') return { error: 'Admin accounts cannot be suspended here.' };
  if (target.is_suspended === suspend) return { success: true };

  const { error: authUpdateError } = await service.auth.admin.updateUserById(userId, {
    ban_duration: suspend ? '876000h' : 'none',
  });
  if (authUpdateError) return { error: `Could not update account sign-in access: ${authUpdateError.message}` };

  const { data: updatedProfile, error: profileUpdateError } = await service
    .from('profiles')
    .update({ is_suspended: suspend })
    .eq('id', userId)
    .neq('role', 'admin')
    .select('id')
    .maybeSingle();

  if (profileUpdateError || !updatedProfile) {
    const { error: rollbackError } = await service.auth.admin.updateUserById(userId, {
      ban_duration: target.is_suspended ? '876000h' : 'none',
    });
    const errorMessage = profileUpdateError?.message ?? 'User status changed before the update could be saved.';
    if (rollbackError) {
      return { error: `${errorMessage} Could not restore sign-in status: ${rollbackError.message}` };
    }
    return { error: errorMessage };
  }

  await audit(service, user.id,
    suspend ? 'user.suspended' : 'user.reactivated',
    'user', userId,
    { suspended: suspend }
  );

  revalidatePath('/admin/users');
  revalidatePath('/admin');
  return { success: true };
}

export async function toggleCompanySuspension(companyId: string, suspend: boolean) {
  const { service, user, error: authError } = await requireAdmin();
  if (authError || !service || !user) return { error: authError };

  const parsedId = z.string().uuid().safeParse(companyId);
  if (!parsedId.success) return { error: 'Invalid company.' };

  const { data: company, error: companyError } = await service
    .from('companies')
    .select('status')
    .eq('id', parsedId.data)
    .maybeSingle();
  if (companyError) return { error: companyError.message };
  if (!company) return { error: 'Company not found.' };

  if (suspend && company.status !== 'verified') {
    return { error: 'Only verified companies can be suspended.' };
  }
  if (!suspend && company.status !== 'suspended') {
    return { error: 'This company is not suspended.' };
  }

  const { data: updatedCompany, error: updateError } = await service
    .from('companies')
    .update({ status: suspend ? 'suspended' : 'verified' })
    .eq('id', parsedId.data)
    .eq('status', suspend ? 'verified' : 'suspended')
    .select('id')
    .maybeSingle();
  if (updateError) return { error: updateError.message };
  if (!updatedCompany) return { error: 'Company status changed before your update. Refresh and try again.' };

  const { error: auditError } = await service.from('audit_logs').insert({
    actor_id: user.id,
    action: suspend ? 'company.suspended' : 'company.reactivated',
    target_type: 'company',
    target_id: parsedId.data,
    details: {},
  });
  if (auditError) {
    return { error: `Company status updated, but the audit entry could not be recorded: ${auditError.message}` };
  }

  revalidatePath('/admin/companies');
  revalidatePath('/admin');
  revalidatePath('/company');
  revalidatePath('/internships');
  return { success: true };
}

export async function promoteToAdmin(userId: string) {
  const { supabase, service, user, error: authError } = await requireAdmin();
  if (authError || !supabase || !service || !user) return { error: authError };

  const { error } = await supabase
    .from('profiles')
    .update({ role: 'admin' })
    .eq('id', userId);

  if (error) return { error: error.message };

  await audit(service, user.id, 'user.promoted_to_admin', 'user', userId);
  revalidatePath('/admin/users');
  return { success: true };
}

// ─── Fields & skills ──────────────────────────────────────────────────────────

export async function addField(nameEn: string, nameAm: string) {
  const { supabase, service, user, error: authError } = await requireAdmin();
  if (authError || !supabase || !service || !user) return { error: authError };

  const { data, error } = await supabase
    .from('fields')
    .insert({ name_en: nameEn, name_am: nameAm || nameEn })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await audit(service, user.id, 'field.created', 'field', data.id, { name_en: nameEn });
  revalidatePath('/admin/fields');
  return { success: true };
}

export async function deleteField(fieldId: string) {
  const { supabase, service, user, error: authError } = await requireAdmin();
  if (authError || !supabase || !service || !user) return { error: authError };

  const { error } = await supabase
    .from('fields')
    .delete()
    .eq('id', fieldId);

  if (error) return { error: error.message };

  await audit(service, user.id, 'field.deleted', 'field', fieldId);
  revalidatePath('/admin/fields');
  return { success: true };
}

export async function addSkill(name: string) {
  const { supabase, service, user, error: authError } = await requireAdmin();
  if (authError || !supabase || !service || !user) return { error: authError };

  const { data, error } = await supabase
    .from('skills')
    .insert({ name })
    .select('id')
    .single();

  if (error) return { error: error.message };

  await audit(service, user.id, 'skill.created', 'skill', data.id, { name });
  revalidatePath('/admin/fields');
  return { success: true };
}

export async function deleteSkill(skillId: string) {
  const { supabase, service, user, error: authError } = await requireAdmin();
  if (authError || !supabase || !service || !user) return { error: authError };

  const { error } = await supabase
    .from('skills')
    .delete()
    .eq('id', skillId);

  if (error) return { error: error.message };

  await audit(service, user.id, 'skill.deleted', 'skill', skillId);
  revalidatePath('/admin/fields');
  return { success: true };
}

// ─── Reports ──────────────────────────────────────────────────────────────────

export async function updateReportStatus(
  reportId: string,
  status: 'investigating' | 'resolved' | 'dismissed',
  note?: string
) {
  const { supabase, service, user, error: authError } = await requireAdmin();
  if (authError || !supabase || !service || !user) return { error: authError };

  const updateData: Record<string, unknown> = { status };
  if (status === 'resolved' || status === 'dismissed') {
    updateData.resolved_by = user.id;
    updateData.resolved_at = new Date().toISOString();
    if (note) updateData.resolution_note = note;
  }

  const { error } = await supabase
    .from('reports')
    .update(updateData)
    .eq('id', reportId);

  if (error) return { error: error.message };

  await audit(service, user.id, `report.${status}`, 'report', reportId, { note });
  revalidatePath('/admin/reports');
  revalidatePath('/admin');
  return { success: true };
}

export async function unlinkCoordinator(memberId: string) {
  const { supabase, service, user, error: authError } = await requireAdmin();
  if (authError || !supabase || !service || !user) return { error: authError };

  const { error } = await service
    .from('university_members')
    .delete()
    .eq('id', memberId);

  if (error) return { error: error.message };

  await audit(service, user.id, 'coordinator.unlinked', 'university_member', memberId);
  revalidatePath('/admin/universities');
  return { success: true };
}

export async function reviewUniversityRegistrationRequest(
  requestId: string,
  decision: 'approve' | 'reject',
  reviewNote?: string
) {
  const { supabase, service, user, error: authError } = await requireAdmin();
  if (authError || !supabase || !service || !user) return { error: authError };

  const { data: request, error: requestError } = await service
    .from('university_registration_requests')
    .select('id, user_id, university_id, requested_university_name, status')
    .eq('id', requestId)
    .maybeSingle();
  if (requestError) return { error: requestError.message };
  if (!request) return { error: 'Registration request not found' };
  if (request.status !== 'pending') return { error: 'This request has already been reviewed' };

  if (decision === 'approve') {
    const { data: documents, error: documentsError } = await service
      .from('university_registration_request_documents')
      .select('id')
      .eq('request_id', requestId);
    if (documentsError) return { error: documentsError.message };
    if (!documents?.length) {
      return { error: 'This request has no affiliation documents and cannot be approved' };
    }

    const { data: coordinator, error: coordinatorError } = await service
      .from('profiles')
      .select('role')
      .eq('id', request.user_id)
      .maybeSingle();
    if (coordinatorError) return { error: coordinatorError.message };
    if (coordinator?.role !== 'university') {
      return { error: 'The requester no longer has a university coordinator account' };
    }
  }

  if (decision === 'reject') {
    const { error } = await service
      .from('university_registration_requests')
      .update({
        status: 'rejected',
        review_note: reviewNote?.trim() || null,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('status', 'pending');
    if (error) return { error: error.message };

    await audit(service, user.id, 'university.registration_rejected', 'university_registration_request', requestId, {
      review_note: reviewNote?.trim() || null,
    });
    revalidatePath('/admin/universities');
    revalidatePath('/university/dashboard');
    return { success: true };
  }

  const { data: existingMembership, error: membershipError } = await service
    .from('university_members')
    .select('university_id')
    .eq('user_id', request.user_id)
    .maybeSingle();
  if (membershipError) return { error: membershipError.message };

  let universityId = request.university_id;
  if (!universityId && request.requested_university_name) {
    const { data: existingUniversity, error } = await service
      .from('universities')
      .select('id')
      .ilike('name', request.requested_university_name)
      .maybeSingle();
    if (error) return { error: error.message };

    if (existingUniversity) {
      universityId = existingUniversity.id;
    } else {
      const { data: university, error: createError } = await service
        .from('universities')
        .insert({ name: request.requested_university_name, status: 'pending' })
        .select('id')
        .single();
      if (createError) return { error: createError.message };
      universityId = university.id;

      const { error: requestUpdateError } = await service
        .from('university_registration_requests')
        .update({ university_id: universityId })
        .eq('id', requestId)
        .eq('status', 'pending');
      if (requestUpdateError) return { error: requestUpdateError.message };
    }
  }

  if (!universityId) return { error: 'The request does not specify a university' };
  if (existingMembership && existingMembership.university_id !== universityId) {
    return { error: 'This coordinator is already linked to a different university' };
  }

  if (!existingMembership) {
    const { error } = await service
      .from('university_members')
      .insert({ university_id: universityId, user_id: request.user_id, member_role: 'coordinator' });
    if (error) return { error: error.message };
  }

  const { error: universityError } = await service
    .from('universities')
    .update({ status: 'verified' })
    .eq('id', universityId);
  if (universityError) return { error: universityError.message };

  const { error: updateError } = await service
    .from('university_registration_requests')
    .update({
      status: 'approved',
      review_note: reviewNote?.trim() || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending');
  if (updateError) return { error: updateError.message };

  await audit(service, user.id, 'university.registration_approved', 'university_registration_request', requestId, {
    university_id: universityId,
    coordinator_id: request.user_id,
  });
  revalidatePath('/admin/universities');
  revalidatePath('/university/dashboard');
  revalidatePath('/admin');
  return { success: true };
}
