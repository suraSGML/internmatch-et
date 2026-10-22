import { describe, expect, it } from 'vitest';
import { isDepartmentEligible } from './departmentEligibility';

describe('isDepartmentEligible', () => {
  it('allows any department when the internship has no department restriction', () => {
    expect(isDepartmentEligible('Accounting', null)).toBe(true);
    expect(isDepartmentEligible(null, '')).toBe(true);
  });

  it('allows a matching department despite case and punctuation differences', () => {
    expect(
      isDepartmentEligible('Computer Science & Engineering', 'computer science engineering')
    ).toBe(true);
  });

  it('allows closely related departments with common academic naming', () => {
    expect(isDepartmentEligible('Computer Science', 'Software Engineering')).toBe(true);
    expect(isDepartmentEligible('Nursing', 'Health Sciences')).toBe(true);
    expect(isDepartmentEligible('Accounting', 'Banking & Finance')).toBe(true);
  });

  it('does not treat a broad shared word as a related department', () => {
    expect(isDepartmentEligible('Civil Engineering', 'Electrical Engineering')).toBe(false);
    expect(isDepartmentEligible('Accounting', 'Computer Science')).toBe(false);
  });

  it('supports multiple allowed departments', () => {
    expect(isDepartmentEligible('Accounting', 'Computer Science, Accounting')).toBe(true);
    expect(isDepartmentEligible('Software Engineering', 'Computer Science; Accounting')).toBe(true);
  });

  it('rejects students from another department or with no department set', () => {
    expect(isDepartmentEligible('Accounting', 'Computer Science')).toBe(false);
    expect(isDepartmentEligible(null, 'Computer Science')).toBe(false);
  });
});
