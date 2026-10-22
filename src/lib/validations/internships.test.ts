import { describe, expect, it } from 'vitest';
import { internshipSchema } from './internships';

describe('internshipSchema', () => {
  it('accepts empty optional form fields when publishing', () => {
    const result = internshipSchema.safeParse({
      title: 'Software Developer Intern',
      description: 'Work with the engineering team on product features.',
      requirements: '',
      field_id: '00000000-0000-0000-0000-000000000001',
      required_department: '',
      required_year_min: '',
      location_city: '',
      work_mode: 'on_site',
      duration_weeks: '8',
      start_date: '',
      deadline: '2026-12-31',
      slots: '1',
      is_paid: false,
      stipend_amount: '',
      benefits: '',
      responsibilities: '',
      requires_university_approval: false,
      status: 'open',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.field_id).toBe('00000000-0000-0000-0000-000000000001');
      expect(result.data.required_year_min).toBeUndefined();
      expect(result.data.start_date).toBeUndefined();
      expect(result.data.stipend_amount).toBeUndefined();
    }
  });

  it('requires the fields needed to publish an internship', () => {
    const result = internshipSchema.safeParse({
      title: 'Developer Intern',
      description: 'A valid description for this internship role.',
      duration_weeks: '8',
      deadline: '',
      slots: '1',
      status: 'open',
      field_id: '00000000-0000-0000-0000-000000000001',
    });

    expect(result.success).toBe(false);
  });
});
