import { createClient } from '@/lib/supabase/server';
import { Suspense } from 'react';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { InternshipCard, type InternshipRow } from '@/components/internships/InternshipCard';
import { InternshipFilters } from '@/components/internships/InternshipFilters';
import { SaveSearchButton } from '@/components/internships/SaveSearchButton';
import { Skeleton } from '@/components/ui/skeleton';
import { Briefcase } from 'lucide-react';

export const dynamic = 'force-dynamic';

interface SearchParams {
  q?: string;
  field?: string;
  city?: string;
  mode?: string;
  paid?: string;
  sort?: string;
  page?: string;
  duration_min?: string;
  duration_max?: string;
  stipend_min?: string;
  stipend_max?: string;
  year_min?: string;
}

const PAGE_SIZE = 12;

export default async function InternshipsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<SearchParams>;
}) {
  const { locale } = await params;
  const filters = await searchParams;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  let canSaveSearch = false;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    canSaveSearch = profile?.role === 'student';
  }

  const requestedPage = Number(filters.page ?? 1);
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  // Build query
  let query = supabase
    .from('internships')
    .select(
      'id, title, description, location_city, work_mode, duration_weeks, deadline, created_at, is_paid, stipend_amount, status, requires_university_approval, required_skills, companies(name, slug, logo_url, status), fields(name_en)',
      { count: 'exact' }
    )
    .eq('status', 'open')
    .gte('deadline', new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()))
    .range(from, to);

  if (filters.q) {
    query = query.or(
      `title.ilike.%${filters.q}%,description.ilike.%${filters.q}%`
    );
  }
  if (filters.field) query = query.eq('field_id', filters.field);
  if (filters.city) query = query.eq('location_city', filters.city);
  if (filters.mode) query = query.eq('work_mode', filters.mode);
  if (filters.paid !== undefined && filters.paid !== '') {
    query = query.eq('is_paid', filters.paid === 'true');
  }
  const durationMin = Number(filters.duration_min);
  if (filters.duration_min && Number.isInteger(durationMin) && durationMin >= 1 && durationMin <= 104) {
    query = query.gte('duration_weeks', durationMin);
  }
  const durationMax = Number(filters.duration_max);
  if (filters.duration_max && Number.isInteger(durationMax) && durationMax >= 1 && durationMax <= 104) {
    query = query.lte('duration_weeks', durationMax);
  }
  const stipendMin = Number(filters.stipend_min);
  if (filters.stipend_min && Number.isFinite(stipendMin) && stipendMin >= 0) {
    query = query.gte('stipend_amount', stipendMin);
  }
  const stipendMax = Number(filters.stipend_max);
  if (filters.stipend_max && Number.isFinite(stipendMax) && stipendMax >= 0) {
    query = query.lte('stipend_amount', stipendMax);
  }
  const yearMin = Number(filters.year_min);
  if (filters.year_min && Number.isInteger(yearMin) && yearMin >= 1 && yearMin <= 7) {
    query = query.or(`required_year_min.is.null,required_year_min.lte.${yearMin}`);
  }

  // Sort
  if (filters.sort === 'deadline') {
    query = query.order('deadline', { ascending: true });
  } else if (filters.sort === 'stipend') {
    query = query.order('stipend_amount', { ascending: false, nullsFirst: false });
  } else {
    query = query.order('created_at', { ascending: false });
  }

  const { data: internships, count, error: internshipsError } = await query;

  // Get fields for filter dropdown
  const { data: fields } = await supabase
    .from('fields')
    .select('id, name_en')
    .order('name_en');

  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1 bg-gray-50">
        {/* Hero bar */}
        <div className="bg-indigo-700 py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Briefcase className="h-6 w-6" />
              Internship Opportunities
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              {count ?? 0} open internships across Ethiopia
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-6 space-y-6">
          {/* Filters */}
          <div className="bg-white rounded-xl p-4 shadow-sm border-0">
            <Suspense fallback={<Skeleton className="h-32 w-full" />}>
              <InternshipFilters fields={fields ?? []} />
              {canSaveSearch && (
                <SaveSearchButton filters={{
                  q: filters.q,
                  field: filters.field,
                  city: filters.city,
                  mode: filters.mode,
                  paid: filters.paid,
                  duration_min: filters.duration_min,
                  duration_max: filters.duration_max,
                  stipend_min: filters.stipend_min,
                  stipend_max: filters.stipend_max,
                  year_min: filters.year_min,
                }} />
              )}
            </Suspense>
          </div>

          {/* Results */}
          {internshipsError ? (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              Could not load internships: {internshipsError.message}
            </div>
          ) : internships && internships.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {internships.map((internship) => (
                <InternshipCard
                  key={internship.id}
                  internship={internship as unknown as InternshipRow}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-16 text-gray-400">
              <Briefcase className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No internships found</p>
              <p className="text-sm mt-1">Try adjusting your filters</p>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 pt-4">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <a
                  key={p}
                  href={`?${new URLSearchParams({ ...filters, page: String(p) }).toString()}`}
                  className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    p === page
                      ? 'bg-indigo-600 text-white'
                      : 'bg-white text-gray-600 hover:bg-indigo-50 border'
                  }`}
                >
                  {p}
                </a>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
