'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

// ─── Schemas ─────────────────────────────────────────────────────────────────

const universityRegistrationRequestSchema = z.object({
  university_id: z.string().uuid().optional(),
  requested_university_name: z.string().trim().min(2).max(200).optional(),
}).refine(
  (data) => Boolean(data.university_id) !== Boolean(data.requested_university_name),
  { message: 'Choose an existing university or enter a new university name' }
);

const departmentNameSchema = z.string().trim().min(2, 'Department name must be at least 2 characters').max(120);

const approvePlacementSchema = z.object({
  placement_id: z.string().uuid(),
  action: z.enum(['approve', 'reject', 'activate', 'complete']),
  reason: z.string().optional(),
});

const issuePlacementLetterSchema = z.object({
  placement_id: z.string().uuid(),
});

const announcementSchema = z.object({
  title: z.string().min(1, 'Title required'),
  body: z.string().min(1, 'Body required'),
  department_id: z.string().uuid().optional(),
});

const revokeCertificateSchema = z.object({
  public_code: z.string(),
  reason: z.string().min(1, 'Reason required'),
  type: z.enum(['certificate', 'placement_letter']),
});

// ─── Actions ─────────────────────────────────────────────────────────────────

async function getCoordinatorUniversity(supabase: Awaited<ReturnType<typeof createClient>>, userId: string) {
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();
  if (profileError) return { universityId: null, error: profileError.message };
  if (profile?.role !== 'university') {
    return { universityId: null, error: 'Only university coordinators can manage departments' };
  }

  const { data: membership, error: membershipError } = await supabase
    .from('university_members')
    .select('university_id, member_role')
    .eq('user_id', userId)
    .maybeSingle();
  if (membershipError) return { universityId: null, error: membershipError.message };
  if (!membership) return { universityId: null, error: 'Your account is not linked to a university' };
  if (!['coordinator', 'admin'].includes(membership.member_role)) {
    return { universityId: null, error: 'You do not have permission to manage departments' };
  }

  return { universityId: membership.university_id, error: null };
}

export async function createUniversityDepartment(name: string) {
  const parsed = departmentNameSchema.safeParse(name);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid department name' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { universityId, error: authError } = await getCoordinatorUniversity(supabase, user.id);
  if (authError || !universityId) return { error: authError ?? 'University not found' };

  const service = createServiceClient();
  const { data: existing, error: lookupError } = await service
    .from('departments')
    .select('id')
    .eq('university_id', universityId)
    .ilike('name', parsed.data)
    .maybeSingle();
  if (lookupError) return { error: lookupError.message };
  if (existing) return { error: 'This department already exists for your university' };

  const { error } = await service
    .from('departments')
    .insert({ university_id: universityId, name: parsed.data });
  if (error) return { error: error.message };

  revalidatePath('/university/students');
  revalidatePath('/university/dashboard');
  return { success: true };
}

export async function renameUniversityDepartment(departmentId: string, name: string) {
  const parsedId = z.string().uuid().safeParse(departmentId);
  const parsedName = departmentNameSchema.safeParse(name);
  if (!parsedId.success) return { error: 'Invalid department' };
  if (!parsedName.success) return { error: parsedName.error.issues[0]?.message ?? 'Invalid department name' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { universityId, error: authError } = await getCoordinatorUniversity(supabase, user.id);
  if (authError || !universityId) return { error: authError ?? 'University not found' };

  const service = createServiceClient();
  const { data: department, error: departmentError } = await service
    .from('departments')
    .select('id')
    .eq('id', parsedId.data)
    .eq('university_id', universityId)
    .maybeSingle();
  if (departmentError) return { error: departmentError.message };
  if (!department) return { error: 'Department not found at your university' };

  const { data: duplicate, error: duplicateError } = await service
    .from('departments')
    .select('id')
    .eq('university_id', universityId)
    .ilike('name', parsedName.data)
    .neq('id', parsedId.data)
    .maybeSingle();
  if (duplicateError) return { error: duplicateError.message };
  if (duplicate) return { error: 'A department with that name already exists' };

  const { error } = await service
    .from('departments')
    .update({ name: parsedName.data })
    .eq('id', parsedId.data)
    .eq('university_id', universityId);
  if (error) return { error: error.message };

  revalidatePath('/university/students');
  revalidatePath('/university/dashboard');
  return { success: true };
}

export async function deleteUniversityDepartment(departmentId: string) {
  const parsedId = z.string().uuid().safeParse(departmentId);
  if (!parsedId.success) return { error: 'Invalid department' };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { universityId, error: authError } = await getCoordinatorUniversity(supabase, user.id);
  if (authError || !universityId) return { error: authError ?? 'University not found' };

  const service = createServiceClient();
  const { data: department, error: departmentError } = await service
    .from('departments')
    .select('id')
    .eq('id', parsedId.data)
    .eq('university_id', universityId)
    .maybeSingle();
  if (departmentError) return { error: departmentError.message };
  if (!department) return { error: 'Department not found at your university' };

  const { error } = await service
    .from('departments')
    .delete()
    .eq('id', parsedId.data)
    .eq('university_id', universityId);
  if (error) return { error: error.message };

  revalidatePath('/university/students');
  revalidatePath('/university/dashboard');
  return { success: true };
}

export async function createUniversityRegistrationRequest(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profile?.role !== 'university') {
    return { error: 'Only university coordinator accounts can submit this request' };
  }

  const files = formData.getAll('documents').filter((value): value is File => value instanceof File && value.size > 0);
  if (files.length === 0) return { error: 'Upload at least one campus affiliation document' };
  if (files.length > 5) return { error: 'Upload no more than 5 documents per request' };

  const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/webp']);
  const allowedExtensions = /\.(pdf|jpe?g|png|webp)$/i;
  for (const file of files) {
    if (file.size > 10 * 1024 * 1024) {
      return { error: `${file.name} exceeds the 10MB file size limit` };
    }
    if ((!allowedTypes.has(file.type) && !allowedExtensions.test(file.name))) {
      return { error: `${file.name} is not a supported PDF or image file` };
    }
  }

  const parsed = universityRegistrationRequestSchema.safeParse({
    university_id: String(formData.get('university_id') ?? '') || undefined,
    requested_university_name: String(formData.get('requested_university_name') ?? '').trim() || undefined,
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Invalid request' };

  const service = createServiceClient();
  const { data: membership } = await service
    .from('university_members')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membership) return { error: 'Your account is already linked to a university' };

  if (parsed.data.university_id) {
    const { data: university } = await service
      .from('universities')
      .select('id')
      .eq('id', parsed.data.university_id)
      .eq('status', 'verified')
      .maybeSingle();
    if (!university) return { error: 'Please select an available, verified university' };
  } else if (parsed.data.requested_university_name) {
    const { data: existing } = await service
      .from('universities')
      .select('id')
      .ilike('name', parsed.data.requested_university_name)
      .maybeSingle();
    if (existing) {
      return { error: 'This university already exists. Select it from the existing university list.' };
    }
  }

  const { data: pending } = await service
    .from('university_registration_requests')
    .select('id')
    .eq('user_id', user.id)
    .eq('status', 'pending')
    .maybeSingle();
  if (pending) return { error: 'You already have a request waiting for review' };

  const { data: request, error } = await service
    .from('university_registration_requests')
    .insert({
      user_id: user.id,
      university_id: parsed.data.university_id ?? null,
      requested_university_name: parsed.data.requested_university_name ?? null,
    })
    .select('id')
    .single();
  if (error) return { error: error.message };

  const uploadedPaths: string[] = [];
  const documentRows: Array<{ request_id: string; file_path: string; original_name: string }> = [];
  for (const file of files) {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const storagePath = `university-request/${user.id}/${request.id}/${crypto.randomUUID()}_${cleanName}`;
    const { error: uploadError } = await service.storage
      .from('verification-docs')
      .upload(storagePath, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type || 'application/pdf',
        upsert: false,
      });
    if (uploadError) {
      const cleanup = await Promise.all([
        uploadedPaths.length
          ? service.storage.from('verification-docs').remove(uploadedPaths)
          : Promise.resolve({ error: null }),
        service.from('university_registration_requests').delete().eq('id', request.id),
      ]);
      const cleanupError = cleanup.find((result) => result.error)?.error;
      if (cleanupError) console.error('University request cleanup failed:', cleanupError);
      return { error: `Could not upload ${file.name}: ${uploadError.message}` };
    }
    uploadedPaths.push(storagePath);
    documentRows.push({ request_id: request.id, file_path: storagePath, original_name: file.name });
  }

  const { error: documentsError } = await service
    .from('university_registration_request_documents')
    .insert(documentRows);
  if (documentsError) {
    const [storageCleanup, requestCleanup] = await Promise.all([
      service.storage.from('verification-docs').remove(uploadedPaths),
      service.from('university_registration_requests').delete().eq('id', request.id),
    ]);
    if (storageCleanup.error) console.error('University document cleanup failed:', storageCleanup.error);
    if (requestCleanup.error) console.error('University request cleanup failed:', requestCleanup.error);
    return { error: documentsError.message };
  }

  revalidatePath('/university/dashboard');
  revalidatePath('/admin/universities');
  return { success: true };
}

/**
 * University coordinator approves or rejects a placement.
 */
export async function approvePlacement(data: z.infer<typeof approvePlacementSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = approvePlacementSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const service = createServiceClient();
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return { error: profileError.message };
  if (!profile || !['university', 'admin'].includes(profile.role)) {
    return { error: 'Only university coordinators or administrators can manage placements.' };
  }

  let universityId: string | null = null;
  if (profile.role !== 'admin') {
    const { data: membership, error: membershipError } = await service
      .from('university_members')
      .select('university_id, member_role')
      .eq('user_id', user.id)
      .maybeSingle();
    if (membershipError) return { error: membershipError.message };
    if (!membership || !['coordinator', 'admin'].includes(membership.member_role)) {
      return { error: 'Your account is not authorized to manage university placements.' };
    }
    universityId = membership.university_id;
  }

  const { data: placement, error: placementError } = await service
    .from('placements')
    .select('id, university_id, status, start_date, end_date')
    .eq('id', parsed.data.placement_id)
    .maybeSingle();
  if (placementError) return { error: placementError.message };
  if (!placement) return { error: 'Placement not found.' };
  if (universityId && placement.university_id !== universityId) {
    return { error: 'You do not have permission to manage this university placement.' };
  }

  const transition = {
    approve: { from: 'pending_approval', to: 'approved' },
    reject: { from: 'pending_approval', to: 'rejected' },
    activate: { from: 'approved', to: 'active' },
    complete: { from: 'active', to: 'completed' },
  }[parsed.data.action];
  if (placement.status !== transition.from) {
    return { error: `This placement cannot be ${parsed.data.action}d from its current status.` };
  }
  if (parsed.data.action === 'reject' && !parsed.data.reason?.trim()) {
    return { error: 'A rejection reason is required.' };
  }
  if (
    parsed.data.action === 'activate' &&
    placement.start_date > new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  ) {
    return { error: 'This placement cannot be marked active before its start date.' };
  }
  if (
    parsed.data.action === 'complete' &&
    placement.end_date &&
    placement.end_date > new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date())
  ) {
    return { error: 'This placement cannot be completed before its end date.' };
  }

  const updateData = {
    status: transition.to,
    ...(parsed.data.action === 'approve' && {
      approved_by: user.id,
      approved_at: new Date().toISOString(),
      rejection_reason: null,
    }),
    ...(parsed.data.action === 'reject' && {
      approved_by: null,
      approved_at: null,
      rejection_reason: parsed.data.reason!.trim(),
    }),
  };
  const { data: updatedPlacement, error } = await service
    .from('placements')
    .update(updateData)
    .eq('id', parsed.data.placement_id)
    .eq('status', transition.from)
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updatedPlacement) return { error: 'Placement status changed before your update could be saved. Refresh and try again.' };
  revalidatePath('/university/placements');
  revalidatePath('/university/students');
  revalidatePath('/student/placement');
  revalidatePath('/student/notifications');
  revalidatePath('/student/logbook');
  return { success: true };
}

/**
 * Issue a placement letter with a unique public code.
 * The code is generated by the database's generate_public_code() function.
 */
export async function issuePlacementLetter(data: z.infer<typeof issuePlacementLetterSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = issuePlacementLetterSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const service = createServiceClient();
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return { error: profileError.message };
  if (!profile || !['university', 'admin'].includes(profile.role)) {
    return { error: 'Only university coordinators or administrators can issue placement letters.' };
  }

  const { data: placement, error: placementError } = await service
    .from('placements')
    .select('id, university_id, status')
    .eq('id', parsed.data.placement_id)
    .maybeSingle();
  if (placementError) return { error: placementError.message };
  if (!placement) return { error: 'Placement not found.' };
  if (!['approved', 'active', 'completed'].includes(placement.status)) {
    return { error: 'A placement letter can only be issued after the coordinator approves the placement.' };
  }
  if (profile.role === 'university') {
    const { data: membership, error: membershipError } = await service
      .from('university_members')
      .select('university_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (membershipError) return { error: membershipError.message };
    if (!membership || membership.university_id !== placement.university_id) {
      return { error: 'You do not have permission to issue a letter for this placement.' };
    }
  }

  // Check if a letter already exists
  const { data: existing, error: existingError } = await service
    .from('placement_letters')
    .select('id, public_code')
    .eq('placement_id', parsed.data.placement_id)
    .is('revoked_at', null)
    .maybeSingle();
  if (existingError) return { error: existingError.message };

  if (existing) return { success: true, public_code: existing.public_code, existing: true };

  const { data: letter, error } = await service
    .from('placement_letters')
    .insert({
      placement_id: parsed.data.placement_id,
      issued_by: user.id,
    })
    .select('id, public_code')
    .single();

  if (error) return { error: error.message };
  revalidatePath('/university/letters');
  revalidatePath('/university/dashboard');
  return { success: true, public_code: letter.public_code };
}

/**
 * Revoke a placement letter or certificate.
 */
export async function revokeDocument(data: z.infer<typeof revokeCertificateSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = revokeCertificateSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const table = parsed.data.type === 'certificate' ? 'certificates' : 'placement_letters';
  const { error } = await supabase
    .from(table)
    .update({
      revoked_at: new Date().toISOString(),
      revoked_by: user.id,
      revoke_reason: parsed.data.reason,
    })
    .eq('public_code', parsed.data.public_code);

  if (error) return { error: error.message };
  revalidatePath('/university/letters');
  return { success: true };
}

/**
 * Post an announcement to all students in the university (or a specific department).
 */
export async function postAnnouncement(
  universityId: string,
  data: z.infer<typeof announcementSchema>
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = announcementSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const service = createServiceClient();
  const { data: membership, error: membershipError } = await service
    .from('university_members')
    .select('university_id, member_role')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) return { error: membershipError.message };
  if (
    !membership ||
    membership.university_id !== universityId ||
    !['coordinator', 'admin'].includes(membership.member_role)
  ) {
    return { error: 'You are not authorized to post announcements for this university.' };
  }

  if (parsed.data.department_id) {
    const { data: department, error: departmentError } = await service
      .from('departments')
      .select('id')
      .eq('id', parsed.data.department_id)
      .eq('university_id', universityId)
      .maybeSingle();
    if (departmentError) return { error: departmentError.message };
    if (!department) return { error: 'Choose a department belonging to this university.' };
  }

  const { error } = await service.from('announcements').insert({
    university_id: universityId,
    author_id: user.id,
    title: parsed.data.title,
    body: parsed.data.body,
    department_id: parsed.data.department_id ?? null,
  });

  if (error) return { error: error.message };
  revalidatePath('/university/announcements');
  revalidatePath('/student/announcements');
  revalidatePath('/student/notifications');
  revalidatePath('/notifications');
  return { success: true };
}

/**
 * Update university letterhead settings.
 * Uses service client to bypass RLS. Caller must be university or admin.
 */
export async function updateUniversitySettings(
  universityId: string,
  data: { header_text?: string; footer_text?: string; accent_color?: string }
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !['university', 'admin'].includes(profile.role)) {
    return { error: 'Not authorized' };
  }

  const service = createServiceClient();
  const { error } = await service
    .from('universities')
    .update({ letterhead: data })
    .eq('id', universityId);

  if (error) return { error: error.message };
  revalidatePath('/university/settings');
  return { success: true };
}
