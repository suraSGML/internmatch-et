'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';

async function requireCompanyOwner() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase: null, user: null, companyId: null, error: 'Not authenticated' };

  const { data: membership } = await supabase
    .from('company_members')
    .select('company_id, member_role, companies(status)')
    .eq('user_id', user.id)
    .single();

  if (!membership) return { supabase: null, user: null, companyId: null, error: 'No company found' };
  const companyJoin = membership.companies;
  const company = Array.isArray(companyJoin) ? companyJoin[0] : companyJoin;
  if (company?.status !== 'verified') {
    return { supabase: null, user: null, companyId: null, error: 'Your company must be verified and active to manage its team.' };
  }
  if (membership.member_role !== 'owner') {
    return { supabase: null, user: null, companyId: null, error: 'Only the company owner can manage team members' };
  }

  return { supabase, user, companyId: membership.company_id, error: null };
}

/**
 * Invite an existing InternMatch ET user to the team by email.
 * The user must already have an account — we look them up by email.
 */
export async function inviteTeamMember(
  companyId: string,
  email: string,
  role: 'recruiter' | 'supervisor'
) {
  const { supabase, error: authError } = await requireCompanyOwner();
  if (authError || !supabase) return { error: authError };

  // Look up the user by email using service role (auth.users is not accessible via anon)
  const service = createServiceClient();
  const { data: authUsers, error: lookupError } = await service.auth.admin.listUsers();
  if (lookupError) return { error: 'Could not look up user: ' + lookupError.message };

  const targetUser = authUsers.users.find(
    (u) => u.email?.toLowerCase() === email.toLowerCase()
  );
  if (!targetUser) {
    return { error: `No account found for ${email}. They must register first.` };
  }

  // Check if already a member
  const { data: existing } = await supabase
    .from('company_members')
    .select('id')
    .eq('company_id', companyId)
    .eq('user_id', targetUser.id)
    .single();

  if (existing) return { error: 'This person is already a team member.' };

  const { error } = await service
    .from('company_members')
    .insert({ company_id: companyId, user_id: targetUser.id, member_role: role });

  if (error) return { error: error.message };
  revalidatePath('/company/team');
  return { success: true };
}

/**
 * Remove a team member (owner cannot be removed).
 */
export async function removeTeamMember(memberId: string) {
  const { supabase, companyId, error: authError } = await requireCompanyOwner();
  if (authError || !supabase) return { error: authError };

  // Verify this member belongs to the caller's company and is not the owner
  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, member_role')
    .eq('id', memberId)
    .single();

  if (!member || member.company_id !== companyId) {
    return { error: 'Member not found in your company' };
  }
  if (member.member_role === 'owner') {
    return { error: 'Cannot remove the company owner' };
  }

  const { error } = await supabase
    .from('company_members')
    .delete()
    .eq('id', memberId);

  if (error) return { error: error.message };
  revalidatePath('/company/team');
  return { success: true };
}

/**
 * Change a team member's role.
 */
export async function updateMemberRole(
  memberId: string,
  newRole: 'recruiter' | 'supervisor'
) {
  const { supabase, companyId, error: authError } = await requireCompanyOwner();
  if (authError || !supabase) return { error: authError };

  const { data: member } = await supabase
    .from('company_members')
    .select('company_id, member_role')
    .eq('id', memberId)
    .single();

  if (!member || member.company_id !== companyId) return { error: 'Member not found' };
  if (member.member_role === 'owner') return { error: 'Cannot change owner role' };

  const { error } = await supabase
    .from('company_members')
    .update({ member_role: newRole })
    .eq('id', memberId);

  if (error) return { error: error.message };
  revalidatePath('/company/team');
  return { success: true };
}

// ─── Company Verification Documents ──────────────────────────────────────────

export async function uploadCompanyVerificationDoc(companyId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  // Verify membership
  const { data: membership } = await supabase
    .from('company_members')
    .select('member_role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership) return { error: 'You are not a member of this company' };
  if (membership.member_role !== 'owner') {
    return { error: 'Only the company owner can upload verification documents' };
  }

  const file = formData.get('file') as File | null;
  const docType = (formData.get('doc_type') as string) || 'registration';

  if (!file || !(file instanceof File) || file.size === 0) {
    return { error: 'Please select a document file' };
  }

  if (file.size > 10 * 1024 * 1024) {
    return { error: 'File size must be under 10MB' };
  }

  const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|jpe?g|png|webp)$/i)) {
    return { error: 'Only PDF or image files (JPG, PNG, WEBP) are supported' };
  }

  if (!['registration', 'tin', 'other'].includes(docType)) {
    return { error: 'Invalid document type' };
  }

  const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `company/${companyId}/${Date.now()}_${cleanName}`;

  const service = createServiceClient();
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const { error: uploadError } = await service.storage
    .from('verification-docs')
    .upload(storagePath, buffer, {
      contentType: file.type || 'application/pdf',
      upsert: true,
    });

  if (uploadError) {
    console.error('Storage upload error:', uploadError);
    return { error: uploadError.message };
  }

  const { data: signed, error: signedUrlError } = await service.storage
    .from('verification-docs')
    .createSignedUrl(storagePath, 60 * 60);
  if (signedUrlError) {
    await service.storage.from('verification-docs').remove([storagePath]);
    return { error: signedUrlError.message };
  }

  const { data: doc, error: insertError } = await service
    .from('verification_documents')
    .insert({
      owner_type: 'company',
      owner_id: companyId,
      file_path: storagePath,
      doc_type: docType as 'registration' | 'tin' | 'other',
    })
    .select()
    .single();

  if (insertError) {
    await service.storage.from('verification-docs').remove([storagePath]);
    return { error: insertError.message };
  }

  // Resubmitting documents after rejection returns the company to review.
  const { error: reviewUpdateError } = await service
    .from('companies')
    .update({ status: 'pending', review_note: null })
    .eq('id', companyId)
    .eq('status', 'rejected');
  if (reviewUpdateError) {
    return { error: `Document uploaded, but the company could not be returned to review: ${reviewUpdateError.message}` };
  }

  revalidatePath('/company/profile');
  revalidatePath('/admin/companies');
  revalidatePath('/admin');
  return { success: true, doc: { ...doc, file_path: signed.signedUrl } };
}

export async function deleteCompanyVerificationDoc(docId: string, companyId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: membership } = await supabase
    .from('company_members')
    .select('member_role')
    .eq('company_id', companyId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (!membership || membership.member_role !== 'owner') {
    return { error: 'Only the company owner can delete documents' };
  }

  const service = createServiceClient();
  const { error } = await service
    .from('verification_documents')
    .delete()
    .eq('id', docId)
    .eq('owner_id', companyId);

  if (error) return { error: error.message };

  revalidatePath('/company/profile');
  revalidatePath('/admin/companies');
  return { success: true };
}
