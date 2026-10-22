import { z } from 'zod';

export const logbookEntrySchema = z.object({
  placement_id: z.string().uuid(),
  week_start: z.string().min(1, 'Week start date required'),
  week_end: z.string().min(1, 'Week end date required'),
  tasks: z.string().min(10, 'Tasks description must be at least 10 characters'),
  skills_practiced: z.string().optional(),
  challenges: z.string().optional(),
  hours: z.coerce.number().min(0.5, 'At least 0.5 hours').max(168, 'Cannot exceed 168 hours/week'),
});

export const supervisorReviewSchema = z.object({
  entry_id: z.string().uuid(),
  action: z.enum(['approved', 'needs_revision']),
  comment: z.string().optional(),
});

export const evaluationSchema = z.object({
  placement_id: z.string().uuid(),
  type: z.enum(['midterm', 'final']),
  ratings: z.object({
    punctuality:      z.number().min(1).max(5),
    technical_skills: z.number().min(1).max(5),
    communication:    z.number().min(1).max(5),
    teamwork:         z.number().min(1).max(5),
    initiative:       z.number().min(1).max(5),
  }),
  comments: z.string().optional(),
  recommendation: z.string().optional(),
  visible_to_student: z.boolean().default(false),
});

export const issueCertificateSchema = z.object({
  placement_id: z.string().uuid(),
});

export type LogbookEntryData = z.infer<typeof logbookEntrySchema>;
export type SupervisorReviewData = z.infer<typeof supervisorReviewSchema>;
export type EvaluationData = z.infer<typeof evaluationSchema>;
