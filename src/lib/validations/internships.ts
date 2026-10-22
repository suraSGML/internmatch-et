import { z } from 'zod';

export const internshipSchema = z.object({
  title: z.string().min(3, 'Title is required'),
  description: z.string().min(20, 'Description must be at least 20 characters'),
  requirements: z.string().optional(),
  required_skills: z.array(
    z.object({
      name: z.string().trim().min(1),
      level: z.string().optional(),
    })
  ).default([]),
  field_id: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().uuid().optional()
  ),
  required_department: z.string().optional(),
  required_year_min: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.coerce.number().int().min(1).max(7).optional()
  ),
  location_city: z.string().optional(),
  work_mode: z.enum(['on_site', 'remote', 'hybrid']).default('on_site'),
  duration_weeks: z.coerce.number().min(1, 'Duration required'),
  start_date: z.preprocess(
    (value) => value === '' ? undefined : value,
    z.string().optional()
  ),
  deadline: z.string().min(1, 'Deadline is required'),
  slots: z.coerce.number().min(1).default(1),
  is_paid: z.coerce.boolean().default(false),
  stipend_amount: z.preprocess(
    (value) => value === '' || value === undefined ? undefined : value,
    z.coerce.number().min(0).optional()
  ),
  benefits: z.string().optional(),
  responsibilities: z.string().optional(),
  requires_university_approval: z.coerce.boolean().default(false),
  status: z.enum(['draft', 'open']).default('draft'),
}).superRefine((internship, context) => {
  if (internship.status === 'open' && !internship.field_id) {
    context.addIssue({
      code: 'custom',
      path: ['field_id'],
      message: 'Select a field related to your company industry before publishing.',
    });
  }
});

export type InternshipFormData = z.infer<typeof internshipSchema>;
