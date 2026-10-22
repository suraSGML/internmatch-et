import { describe, it, expect } from 'vitest';
import { computeMatchScore } from './matchScore';

// ─── Fixtures ────────────────────────────────────────────────────────────────

const baseStudent = {
  skills: [
    { name: 'Python', level: 'intermediate' },
    { name: 'JavaScript', level: 'intermediate' },
    { name: 'SQL', level: 'beginner' },
  ],
  department: 'Computer Science & Engineering',
  city: 'Addis Ababa',
  availability: { duration_weeks: 8, modes: ['on_site', 'hybrid'] },
  year_of_study: 4,
};

const baseInternship = {
  required_skills: [
    { name: 'Python' },
    { name: 'JavaScript' },
    { name: 'Git' },
  ],
  field_name: 'Information Technology',
  required_department: 'Computer Science & Engineering',
  location_city: 'Addis Ababa',
  work_mode: 'hybrid' as const,
  duration_weeks: 8,
  required_year_min: 3,
};

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('computeMatchScore', () => {
  it('returns a score between 0 and 100', () => {
    const result = computeMatchScore(baseStudent, baseInternship);
    expect(result.total).toBeGreaterThanOrEqual(0);
    expect(result.total).toBeLessThanOrEqual(100);
  });

  it('breakdown components sum to total', () => {
    const result = computeMatchScore(baseStudent, baseInternship);
    const sum =
      result.breakdown.skills +
      result.breakdown.field +
      result.breakdown.location +
      result.breakdown.availability +
      result.breakdown.education;
    expect(result.total).toBe(Math.min(Math.round(sum), 100));
  });

  it('scores 40/40 on skills when all required skills match', () => {
    const student = {
      ...baseStudent,
      skills: [{ name: 'Python' }, { name: 'JavaScript' }, { name: 'Git' }],
    };
    const result = computeMatchScore(student, baseInternship);
    expect(result.breakdown.skills).toBe(40);
  });

  it('scores 0/40 on skills when no skills match', () => {
    const student = { ...baseStudent, skills: [{ name: 'AutoCAD' }] };
    const result = computeMatchScore(student, baseInternship);
    expect(result.breakdown.skills).toBe(0);
  });

  it('scores partial on skills for partial match', () => {
    const student = {
      ...baseStudent,
      skills: [{ name: 'Python' }], // 1 of 3
    };
    const result = computeMatchScore(student, baseInternship);
    expect(result.breakdown.skills).toBe(Math.round((1 / 3) * 40));
  });

  it('gives full location score when city matches on-site', () => {
    const internship = { ...baseInternship, work_mode: 'on_site' as const };
    const result = computeMatchScore(baseStudent, internship);
    expect(result.breakdown.location).toBe(15);
  });

  it('gives full location score for remote regardless of city', () => {
    const student = { ...baseStudent, city: 'Hawassa' };
    const internship = { ...baseInternship, work_mode: 'remote' as const };
    const result = computeMatchScore(student, internship);
    expect(result.breakdown.location).toBe(15);
  });

  it('gives low location score for on-site with different city', () => {
    const student = { ...baseStudent, city: 'Bahir Dar' };
    const internship = { ...baseInternship, work_mode: 'on_site' as const, location_city: 'Addis Ababa' };
    const result = computeMatchScore(student, internship);
    expect(result.breakdown.location).toBeLessThan(10);
  });

  it('gives full education score when year meets requirement', () => {
    const result = computeMatchScore(baseStudent, baseInternship);
    expect(result.breakdown.education).toBe(10);
  });

  it('gives 0 education score when year is well below requirement', () => {
    const student = { ...baseStudent, year_of_study: 1 };
    const internship = { ...baseInternship, required_year_min: 4 };
    const result = computeMatchScore(student, internship);
    expect(result.breakdown.education).toBe(0);
  });

  it('provides human-readable explanation strings', () => {
    const result = computeMatchScore(baseStudent, baseInternship);
    expect(result.explanation.length).toBeGreaterThan(0);
    expect(result.explanation.every((e) => typeof e === 'string')).toBe(true);
  });

  it('does not treat a missing student department as a department match', () => {
    const student = { ...baseStudent, department: null };
    const result = computeMatchScore(student, baseInternship);
    expect(result.breakdown.field).toBe(5);
    expect(result.explanation).not.toContain('Strong department/field match');
  });

  it('handles empty skills gracefully', () => {
    const student = { ...baseStudent, skills: [] };
    const result = computeMatchScore(student, baseInternship);
    expect(result.breakdown.skills).toBe(0);
    expect(result.total).toBeGreaterThanOrEqual(0);
  });

  it('handles internship with no required skills — gives full 40 pts', () => {
    const internship = { ...baseInternship, required_skills: [] };
    const result = computeMatchScore(baseStudent, internship);
    expect(result.breakdown.skills).toBe(40);
  });

  it('is case-insensitive for skill matching', () => {
    const student = { ...baseStudent, skills: [{ name: 'python' }, { name: 'JAVASCRIPT' }] };
    const internship = { ...baseInternship, required_skills: [{ name: 'Python' }, { name: 'JavaScript' }] };
    const result = computeMatchScore(student, internship);
    expect(result.breakdown.skills).toBe(40); // 2/2 match
  });
});
