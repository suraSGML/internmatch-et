'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

const savedSearchFiltersSchema = z.object({
  keyword: z.string().trim().max(100).optional(),
  field_id: z.string().uuid().optional(),
  city: z.string().trim().max(100).optional(),
  work_mode: z.enum(['on_site', 'remote', 'hybrid']).optional(),
  is_paid: z.boolean().optional(),
  duration_min: z.number().int().min(1).max(104).optional(),
  duration_max: z.number().int().min(1).max(104).optional(),
  stipend_min: z.number().min(0).max(10_000_000).optional(),
  stipend_max: z.number().min(0).max(10_000_000).optional(),
  required_year_min: z.number().int().min(1).max(7).optional(),
}).refine(
  (filters) => filters.duration_min === undefined || filters.duration_max === undefined ||
    filters.duration_min <= filters.duration_max,
  { message: 'Minimum duration must not exceed maximum duration.' }
).refine(
  (filters) => filters.stipend_min === undefined || filters.stipend_max === undefined ||
    filters.stipend_min <= filters.stipend_max,
  { message: 'Minimum stipend must not exceed maximum stipend.' }
);

async function requireStudent() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, error: 'Please sign in first.' };

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (error) return { supabase, user: null, error: error.message };
  if (profile?.role !== 'student') {
    return { supabase, user: null, error: 'Saved searches are available to student accounts.' };
  }
  return { supabase, user, error: null };
}

export async function createSavedSearch(name: string, filters: unknown) {
  const auth = await requireStudent();
  if (auth.error || !auth.user) return { error: auth.error ?? 'Not authorized.' };

  const parsedName = z.string().trim().min(2).max(60).safeParse(name);
  if (!parsedName.success) return { error: 'Name your search (2–60 characters).' };
  const parsedFilters = savedSearchFiltersSchema.safeParse(filters);
  if (!parsedFilters.success) return { error: parsedFilters.error.issues[0]?.message ?? 'Invalid search filters.' };
  if (!Object.values(parsedFilters.data).some((value) => value !== undefined && value !== '')) {
    return { error: 'Add at least one filter before saving this search.' };
  }

  const { error } = await auth.supabase.from('saved_searches').insert({
    user_id: auth.user.id,
    name: parsedName.data,
    filters: parsedFilters.data,
    alert_on: true,
  });
  if (error) return { error: error.message };
  revalidatePath('/student/searches');
  return { success: true };
}

export async function updateSavedSearchAlert(searchId: string, alertOn: boolean) {
  const auth = await requireStudent();
  if (auth.error || !auth.user) return { error: auth.error ?? 'Not authorized.' };

  const parsedId = z.string().uuid().safeParse(searchId);
  if (!parsedId.success) return { error: 'Invalid saved search.' };
  const { data, error } = await auth.supabase
    .from('saved_searches')
    .update({ alert_on: alertOn })
    .eq('id', parsedId.data)
    .eq('user_id', auth.user.id)
    .select('id')
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Saved search not found.' };
  revalidatePath('/student/searches');
  return { success: true };
}

export async function deleteSavedSearch(searchId: string) {
  const auth = await requireStudent();
  if (auth.error || !auth.user) return { error: auth.error ?? 'Not authorized.' };

  const parsedId = z.string().uuid().safeParse(searchId);
  if (!parsedId.success) return { error: 'Invalid saved search.' };
  const { data, error } = await auth.supabase
    .from('saved_searches')
    .delete()
    .eq('id', parsedId.data)
    .eq('user_id', auth.user.id)
    .select('id')
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'Saved search not found.' };
  revalidatePath('/student/searches');
  return { success: true };
}

export async function reportInternship(internshipId: string, reason: string) {
  const auth = await requireStudent();
  if (auth.error || !auth.user) return { error: auth.error ?? 'Not authorized.' };

  const parsedId = z.string().uuid().safeParse(internshipId);
  const parsedReason = z.string().trim().min(10).max(1000).safeParse(reason);
  if (!parsedId.success) return { error: 'Invalid internship.' };
  if (!parsedReason.success) return { error: 'Please describe the issue in at least 10 characters.' };

  const { error } = await auth.supabase.from('listing_reports').insert({
    internship_id: parsedId.data,
    reporter_id: auth.user.id,
    reason: parsedReason.data,
  });
  if (error?.code === '23505') return { error: 'You have already reported this listing.' };
  if (error) return { error: error.message };
  revalidatePath(`/internships/${parsedId.data}`);
  return { success: true };
}

export async function reviewListingReport(
  reportId: string,
  status: 'reviewed' | 'dismissed' | 'action_taken',
  adminNote: string
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Please sign in first.' };
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return { error: profileError.message };
  if (profile?.role !== 'admin') return { error: 'Only administrators can review listing reports.' };

  const parsedId = z.string().uuid().safeParse(reportId);
  const parsedStatus = z.enum(['reviewed', 'dismissed', 'action_taken']).safeParse(status);
  const parsedNote = z.string().trim().max(1000).safeParse(adminNote);
  if (!parsedId.success || !parsedStatus.success || !parsedNote.success) {
    return { error: 'Invalid report review.' };
  }

  const { data: report, error: reportError } = await supabase
    .from('listing_reports')
    .select('internship_id')
    .eq('id', parsedId.data)
    .eq('status', 'open')
    .maybeSingle();
  if (reportError) return { error: reportError.message };
  if (!report) return { error: 'Open listing report not found.' };

  if (parsedStatus.data === 'action_taken') {
    const service = createServiceClient();
    const { data: internship, error: internshipError } = await service
      .from('internships')
      .select('id, status')
      .eq('id', report.internship_id)
      .maybeSingle();
    if (internshipError) return { error: `Could not load the reported listing: ${internshipError.message}` };
    if (!internship) return { error: 'The reported internship no longer exists.' };

    if (internship.status === 'open') {
      const { error: closeError } = await service
        .from('internships')
        .update({ status: 'closed' })
        .eq('id', internship.id)
        .eq('status', 'open');
      if (closeError) return { error: `Could not close the reported listing: ${closeError.message}` };
    }
  }

  const { data, error } = await supabase
    .from('listing_reports')
    .update({
      status: parsedStatus.data,
      admin_note: parsedNote.data || null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', parsedId.data)
    .eq('status', 'open')
    .select('id')
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: 'This listing report has already been reviewed.' };
  revalidatePath('/admin/listing-reports');
  revalidatePath('/admin');
  revalidatePath(`/internships/${report.internship_id}`);
  revalidatePath('/internships');
  return { success: true };
}
