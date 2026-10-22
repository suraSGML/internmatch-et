const DEPARTMENT_WORD_ALIASES: Record<string, string> = {
  computer: 'technology',
  computing: 'technology',
  software: 'technology',
  information: 'technology',
  ict: 'technology',
  it: 'technology',
  healthcare: 'health',
  medical: 'health',
  medicine: 'health',
  nursing: 'health',
  clinical: 'health',
  pharmacy: 'health',
  accounting: 'finance',
  banking: 'finance',
  financial: 'finance',
  engineer: 'engineering',
};

const IGNORED_WORDS = new Set(['and', 'department', 'of', 'the']);
const RELATED_FIELD_CONCEPTS = new Set(['technology', 'health', 'finance']);

function normalizeDepartmentName(name: string): string {
  return name
    .toLocaleLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function departmentWords(name: string): Set<string> {
  return new Set(
    normalizeDepartmentName(name)
      .split(/\s+/)
      .filter((word) => word && !IGNORED_WORDS.has(word))
      .map((word) => DEPARTMENT_WORD_ALIASES[word] ?? word)
  );
}

function areDepartmentsRelated(studentDepartment: string, requiredDepartment: string): boolean {
  const studentWords = departmentWords(studentDepartment);
  const requiredWords = departmentWords(requiredDepartment);
  if (studentWords.size === 0 || requiredWords.size === 0) return false;

  const sharedWords = [...studentWords].filter((word) => requiredWords.has(word));
  if (sharedWords.length === 0) return false;
  if (sharedWords.some((word) => RELATED_FIELD_CONCEPTS.has(word))) return true;

  const unionSize = new Set([...studentWords, ...requiredWords]).size;
  const similarity = sharedWords.length / unionSize;
  return similarity >= 0.5;
}

export function isDepartmentEligible(
  studentDepartment: string | null | undefined,
  requiredDepartment: string | null | undefined
): boolean {
  if (!requiredDepartment?.trim()) return true;
  if (!studentDepartment?.trim()) return false;

  const allowedDepartments = requiredDepartment
    .split(/[,;|]/)
    .map((name) => name.trim())
    .filter(Boolean);

  return allowedDepartments.some((allowedDepartment) =>
    areDepartmentsRelated(studentDepartment, allowedDepartment)
  );
}
