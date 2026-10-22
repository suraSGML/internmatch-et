import { z } from 'zod';

export const scheduleInterviewSchema = z.object({
  application_id: z.string().uuid(),
  scheduled_at: z.string().datetime({ offset: true, message: 'Choose a valid date and time' }),
  mode: z.enum(['in_person', 'online', 'phone']),
  location_or_link: z.string().trim().min(1, 'Provide the interview location, meeting link, or phone number'),
  notes: z.string().optional(),
});

export const sendOfferSchema = z.object({
  application_id: z.string().uuid(),
  start_date: z.string().min(1, 'Start date required'),
  end_date: z.string().optional(),
  terms: z.string().optional(),
});

export const sendMessageSchema = z.object({
  application_id: z.string().uuid(),
  body: z.string().min(1, 'Message cannot be empty').max(2000),
});

export type ScheduleInterviewData = z.infer<typeof scheduleInterviewSchema>;
export type SendOfferData = z.infer<typeof sendOfferSchema>;
export type SendMessageData = z.infer<typeof sendMessageSchema>;
