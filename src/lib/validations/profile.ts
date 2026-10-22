import { z } from 'zod';

export const baseProfileSchema = z.object({
  full_name: z.string().min(2, 'Name must be at least 2 characters'),
  phone: z.string().optional(),
  city: z.string().optional(),
});

export const studentProfileSchema = z.object({
  bio: z.string().max(500, 'Bio must be under 500 characters').optional().nullable().transform(v => v ?? undefined),
  university_id: z.string().uuid().optional().nullable().transform(v => v ?? undefined),
  department_id: z.string().uuid().optional().nullable().transform(v => v ?? undefined),
  student_number: z.string().optional().nullable().transform(v => v ?? undefined),
  year_of_study: z.coerce.number().min(1).max(7).optional().nullable().transform(v => v ?? undefined),
  expected_graduation: z.string().optional().nullable().transform(v => v ?? undefined),
  visibility: z.enum(['all_verified', 'applied_only']).default('all_verified'),
});

export const companyProfileSchema = z.object({
  name: z.string().min(2, 'Company name required'),
  description: z.string().max(1000).optional().nullable().transform((v) => v || undefined),
  industry: z.string().optional().nullable().transform((v) => v || undefined),
  size: z.enum(['1-10', '11-50', '51-200', '201-500', '500+']).optional().nullable().transform((v) => v || undefined),
  city: z.string().optional().nullable().transform((v) => v || undefined),
  address: z.string().optional().nullable().transform((v) => v || undefined),
  website: z.string().optional().nullable().transform((v) => (v && v.trim() ? v.trim() : undefined)),
  contact_person: z.string().optional().nullable().transform((v) => v || undefined),
  registration_number: z.string().optional().nullable().transform((v) => v || undefined),
});

export type BaseProfileData = z.infer<typeof baseProfileSchema>;
export type StudentProfileData = z.infer<typeof studentProfileSchema>;
export type CompanyProfileData = z.infer<typeof companyProfileSchema>;
