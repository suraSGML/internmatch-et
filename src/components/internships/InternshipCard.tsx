import Link from 'next/link';
import { MapPin, Clock, Banknote, Building2, BookOpen, Calendar, Pencil, Sparkles } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { formatETB, daysUntilDate } from '@/lib/utils';

// Supabase returns joined rows as arrays; we normalise to single objects below
export interface InternshipRow {
  id: string;
  title: string;
  description: string;
  location_city?: string | null;
  work_mode: string;
  duration_weeks: number;
  deadline: string;
  created_at?: string;
  is_paid: boolean;
  stipend_amount?: number | null;
  status: string;
  requires_university_approval: boolean;
  required_skills?: Array<{ name: string; level?: string }> | null;
  // Supabase join can return object or array — accept both
  companies?: { name: string; slug?: string | null; logo_url?: string | null; status?: string } | Array<{ name: string; slug?: string | null; logo_url?: string | null; status?: string }> | null;
  fields?: { name_en: string } | Array<{ name_en: string }> | null;
}

interface InternshipCardProps {
  internship: InternshipRow;
  locale: string;
  matchScore?: number;
  isSaved?: boolean;
  showStatus?: boolean;
}

export function InternshipCard({
  internship,
  locale,
  matchScore,
  isSaved,
  showStatus = false,
}: InternshipCardProps) {
  // Supabase nested joins can return object or single-element array
  const company = Array.isArray(internship.companies)
    ? internship.companies[0] ?? null
    : internship.companies;
  const daysLeft = daysUntilDate(internship.deadline);
  const isExpired = daysLeft < 0;
  const daysSincePosted = internship.created_at
    ? Math.floor((new Date().getTime() - new Date(internship.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : null;
  const isNew = daysSincePosted !== null && daysSincePosted >= 0 && daysSincePosted <= 7;

  return (
    <Card className="border-0 shadow-sm hover:shadow-md transition-shadow group">
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start gap-3">
          {company?.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={company.logo_url} alt="" className="h-10 w-10 rounded-lg object-cover shrink-0" />
          ) : (
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-indigo-600" />
            </div>
          )}

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/${locale}/internships/${internship.id}`}
                  className="font-semibold text-gray-900 hover:text-indigo-600 transition-colors line-clamp-1 group-hover:text-indigo-600"
                >
                  {internship.title}
                </Link>
                <p className="text-sm text-gray-500 mt-0.5">
                  {company?.slug ? (
                    <Link href={`/${locale}/companies/${company.slug}`} className="hover:text-indigo-600 hover:underline">
                      {company.name}
                    </Link>
                  ) : company?.name ?? 'Company'}
                  {company?.status === 'verified' && (
                    <span className="ml-1 text-xs text-indigo-500">✓ Verified</span>
                  )}
                </p>
                {isNew && (
                  <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700">
                    <Sparkles className="h-3 w-3" /> New · {daysSincePosted === 0 ? 'today' : `${daysSincePosted}d ago`}
                  </span>
                )}
                {isSaved && <Badge variant="secondary" className="ml-1 text-[10px]">Saved</Badge>}
              </div>

              {/* Match score badge */}
              {matchScore !== undefined && (
                <div
                  className={`shrink-0 text-xs font-bold px-2 py-1 rounded-full ${
                    matchScore >= 70
                      ? 'bg-green-100 text-green-700'
                      : matchScore >= 40
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {matchScore}% match
                </div>
              )}
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-3 mt-2 text-xs text-gray-500">
              {internship.location_city && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  {internship.location_city}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {internship.duration_weeks} weeks
              </span>
              {internship.is_paid ? (
                <span className="flex items-center gap-1 text-green-600 font-medium">
                  <Banknote className="h-3 w-3" />
                  {internship.stipend_amount
                    ? `${formatETB(internship.stipend_amount)}/mo`
                    : 'Paid'}
                </span>
              ) : (
                <span className="text-gray-400">Unpaid</span>
              )}
              <span className="capitalize">
                {internship.work_mode.replace('_', ' ')}
              </span>
              {internship.requires_university_approval && (
                <span className="flex items-center gap-1 text-purple-600">
                  <BookOpen className="h-3 w-3" />
                  Uni approval
                </span>
              )}
            </div>

            {/* Skills */}
            {internship.required_skills && internship.required_skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {internship.required_skills.slice(0, 4).map((s) => (
                  <Badge
                    key={s.name}
                    variant="outline"
                    className="text-xs px-2 py-0 bg-indigo-50 text-indigo-700 border-indigo-100"
                  >
                    {s.name}
                  </Badge>
                ))}
                {internship.required_skills.length > 4 && (
                  <Badge variant="outline" className="text-xs px-2 py-0">
                    +{internship.required_skills.length - 4}
                  </Badge>
                )}
              </div>
            )}

            {/* Deadline */}
            <div className="flex items-center justify-between mt-3">
              <span
                className={`flex items-center gap-1 text-xs ${
                  isExpired
                    ? 'text-red-500'
                    : daysLeft <= 3
                    ? 'text-orange-500 font-medium'
                    : 'text-gray-400'
                }`}
              >
                <Calendar className="h-3 w-3" />
                {isExpired
                  ? 'Deadline passed'
                  : daysLeft === 0
                  ? 'Due today!'
                  : `${daysLeft} days left`}
              </span>

              <div className="flex items-center gap-2">
                {showStatus && <StatusBadge status={internship.status} />}
                {showStatus && ['draft', 'open'].includes(internship.status) && (
                  <Button asChild size="sm" variant="outline">
                    <Link
                      href={`/${locale}/company/internships/${internship.id}`}
                      aria-label={`Edit ${internship.title}`}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
