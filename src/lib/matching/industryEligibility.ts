const INDUSTRY_FIELD_ALLOWLIST: Record<string, string[]> = {
  'information technology': ['information technology'],
  'banking & finance': ['accounting & finance', 'business administration'],
  telecommunications: ['information technology', 'engineering'],
  healthcare: ['health & medicine'],
  education: ['education & training'],
  manufacturing: ['engineering', 'logistics & supply chain', 'accounting & finance'],
  agriculture: ['agriculture', 'engineering', 'environmental science'],
  'ngo / non-profit': [
    'education & training',
    'health & medicine',
    'agriculture',
    'environmental science',
    'research & development',
    'law & legal services',
  ],
  government: [
    'business administration',
    'law & legal services',
    'education & training',
    'health & medicine',
    'agriculture',
    'environmental science',
  ],
  'retail & e-commerce': [
    'marketing & sales',
    'business administration',
    'logistics & supply chain',
    'accounting & finance',
  ],
  'media & communications': ['media & communications', 'marketing & sales'],
};

function normalize(value: string): string {
  return value.toLocaleLowerCase().replace(/\s+/g, ' ').trim();
}

export function getAllowedInternshipFields(industry: string | null | undefined): string[] {
  if (!industry) return [];
  return INDUSTRY_FIELD_ALLOWLIST[normalize(industry)] ?? [];
}

export function isInternshipFieldAllowed(
  industry: string | null | undefined,
  fieldName: string | null | undefined
): boolean {
  if (!fieldName) return false;
  const allowedFields = getAllowedInternshipFields(industry);
  const normalizedField = normalize(fieldName);
  return allowedFields.some((allowedField) => normalize(allowedField) === normalizedField);
}
