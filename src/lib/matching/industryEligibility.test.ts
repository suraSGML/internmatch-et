import { describe, expect, it } from 'vitest';
import { getAllowedInternshipFields, isInternshipFieldAllowed } from './industryEligibility';

describe('industry eligibility for internship fields', () => {
  it('limits a healthcare company to health-related internships', () => {
    expect(isInternshipFieldAllowed('Healthcare', 'Health & Medicine')).toBe(true);
    expect(isInternshipFieldAllowed('Healthcare', 'Information Technology')).toBe(false);
  });

  it('allows fields related to technology and finance industries', () => {
    expect(isInternshipFieldAllowed('Information Technology', 'Information Technology')).toBe(true);
    expect(isInternshipFieldAllowed('Banking & Finance', 'Accounting & Finance')).toBe(true);
  });

  it('returns no publishable fields when industry is missing or unspecified', () => {
    expect(getAllowedInternshipFields(null)).toEqual([]);
    expect(getAllowedInternshipFields('Other')).toEqual([]);
  });
});
