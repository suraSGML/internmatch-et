'use server';

import { createClient } from '@/lib/supabase/server';
import { createServiceClient } from '@/lib/supabase/service';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import {
  scheduleInterviewSchema,
  sendOfferSchema,
  sendMessageSchema,
  type ScheduleInterviewData,
  type SendOfferData,
  type SendMessageData,
} from '@/lib/validations/interviews';

export type { ScheduleInterviewData, SendOfferData, SendMessageData };

// ─── Interview actions ────────────────────────────────────────────────────────

export async function scheduleInterview(data: z.infer<typeof scheduleInterviewSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = scheduleInterviewSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };
  if (new Date(parsed.data.scheduled_at) <= new Date()) {
    return { error: 'Interview date and time must be in the future.' };
  }

  const service = createServiceClient();
  const { data: application, error: applicationError } = await service
    .from('applications')
    .select('id, student_id, status, internships(company_id)')
    .eq('id', parsed.data.application_id)
    .maybeSingle();
  if (applicationError) return { error: applicationError.message };
  if (!application) return { error: 'Application not found.' };
  if (application.status !== 'shortlisted') {
    return { error: 'Only shortlisted applicants can be scheduled for an interview.' };
  }

  const { data: membership, error: membershipError } = await service
    .from('company_members')
    .select('company_id')
    .eq('user_id', user.id)
    .maybeSingle();
  if (membershipError) return { error: membershipError.message };

  const internshipJoin = application.internships;
  const internship = Array.isArray(internshipJoin) ? internshipJoin[0] : internshipJoin;
  if (!membership || membership.company_id !== internship?.company_id) {
    return { error: 'You do not have permission to schedule an interview for this application.' };
  }
  const { data: company, error: companyError } = await service
    .from('companies')
    .select('status')
    .eq('id', membership.company_id)
    .maybeSingle();
  if (companyError) return { error: companyError.message };
  if (company?.status !== 'verified') {
    return { error: 'Your company must be verified and active to schedule interviews.' };
  }

  const { data: interview, error: interviewError } = await service.from('interviews').insert({
    application_id: parsed.data.application_id,
    scheduled_at: parsed.data.scheduled_at,
    mode: parsed.data.mode,
    location_or_link: parsed.data.location_or_link,
    notes: parsed.data.notes,
    status: 'scheduled',
  }).select('id').single();
  if (interviewError) return { error: interviewError.message };

  const notificationWindowStart = new Date().toISOString();
  const { error: statusError } = await service
    .from('applications')
    .update({ status: 'interview_scheduled' })
    .eq('id', parsed.data.application_id);
  if (statusError) {
    const { error: cleanupError } = await service
      .from('interviews')
      .delete()
      .eq('id', interview.id);
    return {
      error: cleanupError
        ? `Application status could not be updated (${statusError.message}), and the new interview could not be removed (${cleanupError.message}).`
        : `Interview could not be scheduled because the application status could not be updated: ${statusError.message}`,
    };
  }

  const scheduledDate = new Date(parsed.data.scheduled_at);
  const formattedDate = new Intl.DateTimeFormat('en-ET', {
    timeZone: 'Africa/Addis_Ababa',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(scheduledDate);
  const modeLabel = parsed.data.mode.replace(/_/g, ' ');
  const detailLabel = parsed.data.mode === 'in_person'
    ? 'Location'
    : parsed.data.mode === 'online'
      ? 'Meeting link'
      : 'Phone';
  const notificationBody = [
    `Your ${modeLabel} interview is scheduled for ${formattedDate} EAT.`,
    `${detailLabel}: ${parsed.data.location_or_link}`,
    parsed.data.notes?.trim() ? `Notes: ${parsed.data.notes.trim()}` : null,
  ].filter(Boolean).join(' ');

  const { data: recentNotifications, error: notificationsLookupError } = await service
    .from('notifications')
    .select('id, type, title, body, link, created_at')
    .eq('user_id', application.student_id)
    .in('type', ['interview_scheduled', 'application_status_changed'])
    .gte('created_at', notificationWindowStart)
    .order('created_at', { ascending: false })
    .limit(10);

  let notificationWarning: string | undefined;
  if (notificationsLookupError) {
    notificationWarning = `Interview was scheduled, but its notification could not be checked: ${notificationsLookupError.message}`;
  } else {
    const triggerNotification = (recentNotifications ?? []).find((notification) =>
      notification.type === 'interview_scheduled' ||
      notification.body?.includes('interview_scheduled')
    );
    const notificationData = {
      type: 'interview_scheduled' as const,
      title: 'Interview scheduled',
      body: notificationBody,
      link: '/student/interviews',
      read_at: null,
    };
    const notificationResult = triggerNotification
      ? await service
          .from('notifications')
          .update(notificationData)
          .eq('id', triggerNotification.id)
      : await service
          .from('notifications')
          .insert({ user_id: application.student_id, ...notificationData });
    if (notificationResult.error) {
      notificationWarning = `Interview was scheduled, but the student notification could not be saved: ${notificationResult.error.message}`;
    }
  }

  revalidatePath('/company/internships');
  revalidatePath('/student/interviews');
  revalidatePath('/student/applications');
  revalidatePath('/student/notifications');
  return { success: true, notificationWarning };
}

export async function cancelInterview(interviewId: string) {
  const supabase = await createClient();
  const { error } = await supabase
    .from('interviews')
    .update({ status: 'cancelled' })
    .eq('id', interviewId);
  if (error) return { error: error.message };
  revalidatePath('/student/interviews');
  return { success: true };
}

// ─── Offer actions ────────────────────────────────────────────────────────────

export async function sendOffer(data: z.infer<typeof sendOfferSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = sendOfferSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  if (parsed.data.end_date && parsed.data.end_date < parsed.data.start_date) {
    return { error: 'The end date must be on or after the start date.' };
  }

  const service = createServiceClient();
  const { data: profile, error: profileError } = await service
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();
  if (profileError) return { error: profileError.message };
  if (!profile || !['company', 'admin'].includes(profile.role)) {
    return { error: 'Only company accounts can send internship offers.' };
  }

  const { data: application, error: applicationError } = await service
    .from('applications')
    .select('id, status, internships(company_id)')
    .eq('id', parsed.data.application_id)
    .maybeSingle();
  if (applicationError) return { error: applicationError.message };
  if (!application) return { error: 'Application not found.' };
  if (!['shortlisted', 'interview_scheduled'].includes(application.status)) {
    return { error: 'Only shortlisted applicants or applicants with a scheduled interview can receive an offer.' };
  }

  if (profile.role !== 'admin') {
    const { data: membership, error: membershipError } = await service
      .from('company_members')
      .select('company_id')
      .eq('user_id', user.id)
      .maybeSingle();
    if (membershipError) return { error: membershipError.message };
    const internshipJoin = application.internships;
    const internship = Array.isArray(internshipJoin) ? internshipJoin[0] : internshipJoin;
    if (!membership || membership.company_id !== internship?.company_id) {
      return { error: 'You do not have permission to send an offer for this application.' };
    }
    const { data: company, error: companyError } = await service
      .from('companies')
      .select('status')
      .eq('id', membership.company_id)
      .maybeSingle();
    if (companyError) return { error: companyError.message };
    if (company?.status !== 'verified') {
      return { error: 'Your company must be verified and active to send offers.' };
    }
  }

  const { data: offer, error: offerError } = await service.from('offers').insert({
    application_id: parsed.data.application_id,
    start_date: parsed.data.start_date,
    end_date: parsed.data.end_date,
    terms: parsed.data.terms,
    status: 'pending',
  }).select('id').single();
  if (offerError) return { error: offerError.message };

  const { data: updatedApplication, error: statusError } = await service
    .from('applications')
    .update({ status: 'offered' })
    .eq('id', parsed.data.application_id)
    .in('status', ['shortlisted', 'interview_scheduled'])
    .select('id')
    .maybeSingle();
  if (statusError) {
    const { error: cleanupError } = await service.from('offers').delete().eq('id', offer.id);
    return {
      error: cleanupError
        ? `Offer status could not be updated (${statusError.message}); the offer record could not be removed (${cleanupError.message}).`
        : `Could not update application status to Offered: ${statusError.message}`,
    };
  }
  if (!updatedApplication) {
    const { error: cleanupError } = await service.from('offers').delete().eq('id', offer.id);
    return {
      error: cleanupError
        ? `Application status was not updated to Offered, and the offer could not be removed: ${cleanupError.message}`
        : 'Application status changed before the offer could be sent. Refresh and try again.',
    };
  }

  const { error: interviewsError } = await service
    .from('interviews')
    .update({ status: 'cancelled' })
    .eq('application_id', parsed.data.application_id)
    .eq('status', 'scheduled');

  revalidatePath('/company/dashboard');
  revalidatePath('/company/applicants');
  revalidatePath('/student/applications');
  revalidatePath('/student/dashboard');
  revalidatePath('/student/interviews');
  revalidatePath('/student/notifications');
  revalidatePath('/company/internships');
  return {
    success: true,
    warning: interviewsError
      ? `Offer sent and application marked Offered, but scheduled interview status could not be updated: ${interviewsError.message}`
      : undefined,
  };
}

/**
 * Student responds to an offer (accept or decline).
 * Accepting triggers the slot-allocation DB trigger.
 */
export async function respondToOffer(
  offerId: string,
  response: 'accepted' | 'declined'
) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const service = createServiceClient();
  const { data: offer, error: offerError } = await service
    .from('offers')
    .select('id, status, applications!inner(student_id)')
    .eq('id', offerId)
    .maybeSingle();
  if (offerError) return { error: offerError.message };
  if (!offer) return { error: 'Offer not found.' };
  if (offer.status !== 'pending') return { error: 'This offer has already been answered.' };

  const applicationJoin = offer.applications;
  const application = Array.isArray(applicationJoin) ? applicationJoin[0] : applicationJoin;
  if (application?.student_id !== user.id) {
    return { error: 'You do not have permission to respond to this offer.' };
  }

  const { data: updatedOffer, error } = await service
    .from('offers')
    .update({ status: response })
    .eq('id', offerId)
    .eq('status', 'pending')
    .select('id')
    .maybeSingle();

  if (error) return { error: error.message };
  if (!updatedOffer) return { error: 'This offer has already been answered.' };
  revalidatePath('/student/placement');
  revalidatePath('/student/applications');
  revalidatePath('/student/notifications');
  revalidatePath('/university/placements');
  revalidatePath('/university/students');
  revalidatePath('/company/internships');
  revalidatePath('/company/interns');
  return { success: true };
}

// ─── Messaging actions ────────────────────────────────────────────────────────

export async function sendMessage(data: z.infer<typeof sendMessageSchema>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  const parsed = sendMessageSchema.safeParse(data);
  if (!parsed.success) return { error: parsed.error.flatten().fieldErrors };

  const { error } = await supabase.from('messages').insert({
    application_id: parsed.data.application_id,
    sender_id: user.id,
    body: parsed.data.body,
  });
  if (error) return { error: error.message };
  return { success: true };
}

export async function markMessagesRead(applicationId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'Not authenticated' };

  await supabase
    .from('messages')
    .update({ read_at: new Date().toISOString() })
    .eq('application_id', applicationId)
    .neq('sender_id', user.id)
    .is('read_at', null);

  return { success: true };
}
