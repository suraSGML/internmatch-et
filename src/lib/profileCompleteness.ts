export interface ProfileCompletenessInput {
  fullName?: string | null;
  phone?: string | null;
  city?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  skills?: Array<unknown> | null;
  universityId?: string | null;
  departmentId?: string | null;
  yearOfStudy?: number | string | null;
  cvUrl?: string | null;
}

export function computeProfileCompleteness(input: ProfileCompletenessInput) {
  const checks = [
    { label: 'Full name', met: Boolean(input.fullName?.trim()) },
    { label: 'University', met: Boolean(input.universityId) },
    { label: 'Department', met: Boolean(input.departmentId) },
    { label: 'Year of study', met: Boolean(input.yearOfStudy && Number(input.yearOfStudy) > 0) },
    { label: 'Bio / About me', met: Boolean(input.bio?.trim()) },
    { label: 'Skills added', met: Array.isArray(input.skills) && input.skills.length > 0 },
    { label: 'City / Location', met: Boolean(input.city?.trim()) },
    { label: 'Phone number', met: Boolean(input.phone?.trim()) },
    { label: 'Profile photo', met: Boolean(input.avatarUrl?.trim()) },
  ];

  const total = checks.length;
  const completed = checks.filter((c) => c.met).length;
  const percentage = Math.round((completed / total) * 100);
  const missingItems = checks.filter((c) => !c.met).map((c) => c.label);

  return { percentage, missingItems, completed, total };
}
