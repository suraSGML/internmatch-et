import { z } from 'zod';

export const applySchema = z.object({
  internship_id: z.string().uuid(),
  cover_note: z.string().max(2000).optional(),
  cv_url: z.string().url().optional(),
  answers: z.array(
    z.object({
      question_id: z.string().uuid(),
      answer: z.string().min(1, 'Answer is required'),
    })
  ).optional(),
});

export type ApplyFormData = z.infer<typeof applySchema>;
