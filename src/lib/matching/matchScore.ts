/**
 * InternMatch ET — Match Score Algorithm
 *
 * Computes a 0–100 score between a student profile and an internship.
 *
 * Weights (must sum to 100):
 *   skills overlap      40 pts
 *   field / department  20 pts
 *   location fit        15 pts
 *   availability fit    15 pts
 *   education level     10 pts
 *
 * The function is pure (no I/O) so it is easy to unit-test and to explain
 * at a thesis defence. Replace the weighted formula with embeddings later
 * without changing the public interface.
 */

export interface SkillTag {
  name: string;
  level?: string;
}

export interface StudentForMatch {
  skills: SkillTag[];
  department?: string | null;       // e.g. "Computer Science & Engineering"
  university_id?: string | null;
  availability?: {
    start_date?: string;
    duration_weeks?: number;
    modes?: string[];
  };
  year_of_study?: number | null;
  city?: string | null;
}

export interface InternshipForMatch {
  required_skills: SkillTag[];
  field_name?: string | null;       // e.g. "Information Technology"
  required_department?: string | null;
  location_city?: string | null;
  work_mode: string;                // 'on_site' | 'remote' | 'hybrid'
  duration_weeks: number;
  start_date?: string | null;
  required_year_min?: number | null;
}

export interface MatchBreakdown {
  skills: number;       // 0–40
  field: number;        // 0–20
  location: number;     // 0–15
  availability: number; // 0–15
  education: number;    // 0–10
}

export interface MatchResult {
  total: number;           // 0–100
  breakdown: MatchBreakdown;
  explanation: string[];   // human-readable reasons shown to the student
}

// ─── Helper: normalise skill name for comparison ─────────────────────────────

function normaliseName(s: string): string {
  return s.toLowerCase().replace(/[\s._-]+/g, '');
}

// ─── Skills component (0–40) ─────────────────────────────────────────────────

function scoreSkills(student: StudentForMatch, internship: InternshipForMatch): {
  score: number;
  matched: number;
  total: number;
} {
  const required = internship.required_skills ?? [];
  if (required.length === 0) return { score: 40, matched: 0, total: 0 };

  const studentNames = new Set(
    (student.skills ?? []).map((s) => normaliseName(s.name))
  );

  let matched = 0;
  for (const req of required) {
    if (studentNames.has(normaliseName(req.name))) matched++;
  }

  const ratio = matched / required.length;
  return { score: Math.round(ratio * 40), matched, total: required.length };
}

// ─── Field / department component (0–20) ─────────────────────────────────────

function scoreField(student: StudentForMatch, internship: InternshipForMatch): number {
  const dept = (student.department ?? '').toLowerCase();
  const reqDept = (internship.required_department ?? '').toLowerCase();
  const fieldName = (internship.field_name ?? '').toLowerCase();

  if (!dept && !reqDept) return 10; // no data → neutral

  // Exact or substring department match
  if (dept && reqDept && (dept.includes(reqDept) || reqDept.includes(dept))) return 20;

  // Department keywords overlap with field name
  if (fieldName) {
    const deptWords = dept.split(/\s+/);
    const fieldWords = fieldName.split(/\s+/);
    const overlap = deptWords.filter((w) => w.length > 3 && fieldWords.some((fw) => fw.includes(w)));
    if (overlap.length > 0) return 12;
  }

  return 5;
}

// ─── Location component (0–15) ───────────────────────────────────────────────

function scoreLocation(student: StudentForMatch, internship: InternshipForMatch): number {
  const mode = internship.work_mode;

  // Remote: location irrelevant
  if (mode === 'remote') return 15;

  // Hybrid: partial benefit if city matches
  const studentCity = (student.city ?? '').toLowerCase();
  const internCity = (internship.location_city ?? '').toLowerCase();

  if (!internCity) return 10;

  if (studentCity && (studentCity === internCity || internCity.includes(studentCity))) {
    return 15;
  }

  // Hybrid but different city — partial
  if (mode === 'hybrid') return 8;

  // On-site, different city
  return 3;
}

// ─── Availability component (0–15) ───────────────────────────────────────────

function scoreAvailability(student: StudentForMatch, internship: InternshipForMatch): number {
  const avail = student.availability ?? {};
  let score = 0;

  // Duration fit (0–8)
  if (avail.duration_weeks && internship.duration_weeks) {
    const diff = Math.abs(avail.duration_weeks - internship.duration_weeks);
    if (diff === 0) score += 8;
    else if (diff <= 2) score += 6;
    else if (diff <= 4) score += 3;
    else score += 1;
  } else {
    score += 4; // no data → neutral
  }

  // Work mode preference fit (0–7)
  const modes = avail.modes ?? [];
  if (modes.length === 0) {
    score += 4; // neutral
  } else if (modes.includes(internship.work_mode)) {
    score += 7;
  } else if (internship.work_mode === 'hybrid' && (modes.includes('on_site') || modes.includes('remote'))) {
    score += 4;
  } else {
    score += 1;
  }

  return Math.min(score, 15);
}

// ─── Education component (0–10) ──────────────────────────────────────────────

function scoreEducation(student: StudentForMatch, internship: InternshipForMatch): number {
  const minYear = internship.required_year_min;
  const studentYear = student.year_of_study;

  if (!minYear) return 10; // no requirement → full marks

  if (!studentYear) return 5; // unknown year → neutral

  if (studentYear >= minYear) return 10;

  // One year below minimum → partial credit
  if (studentYear === minYear - 1) return 5;

  return 0;
}

// ─── Public API ──────────────────────────────────────────────────────────────

export function computeMatchScore(
  student: StudentForMatch,
  internship: InternshipForMatch
): MatchResult {
  const { score: skillScore, matched, total } = scoreSkills(student, internship);
  const fieldScore = scoreField(student, internship);
  const locationScore = scoreLocation(student, internship);
  const availScore = scoreAvailability(student, internship);
  const eduScore = scoreEducation(student, internship);

  const totalScore = skillScore + fieldScore + locationScore + availScore + eduScore;

  // Build human-readable explanations
  const explanation: string[] = [];

  if (total > 0) {
    explanation.push(
      matched === total
        ? `Matches all ${total} required skill${total > 1 ? 's' : ''}`
        : matched > 0
        ? `Matches ${matched} of ${total} required skill${total > 1 ? 's' : ''}`
        : `Does not match the required skills`
    );
  }

  if (fieldScore >= 18) explanation.push('Strong department/field match');
  else if (fieldScore >= 10) explanation.push('Partial field match');

  if (locationScore === 15 && internship.work_mode !== 'remote') {
    explanation.push('Same city');
  } else if (internship.work_mode === 'remote') {
    explanation.push('Remote — open to all locations');
  }

  if (availScore >= 12) explanation.push('Availability fits well');

  if (eduScore === 10 && internship.required_year_min) {
    explanation.push(`Meets year ${internship.required_year_min}+ requirement`);
  } else if (eduScore === 0) {
    explanation.push('Below minimum year of study');
  }

  return {
    total: Math.min(Math.round(totalScore), 100),
    breakdown: {
      skills: skillScore,
      field: fieldScore,
      location: locationScore,
      availability: availScore,
      education: eduScore,
    },
    explanation,
  };
}
