import { createClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { InternshipCard, type InternshipRow } from '@/components/internships/InternshipCard';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, MapPin, Globe, Users, ShieldCheck, Briefcase } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CompanyProfilePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const supabase = await createClient();

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'verified')
    .single();

  if (companyError && companyError.code !== 'PGRST116') {
    throw new Error(`Could not load company profile: ${companyError.message}`);
  }
  if (!company) notFound();

  const { data: internships, error: internshipsError } = await supabase
    .from('internships')
    .select('id, title, description, location_city, work_mode, duration_weeks, deadline, created_at, is_paid, stipend_amount, status, requires_university_approval, required_skills, companies(name, slug, logo_url, status)')
    .eq('company_id', company.id)
    .eq('status', 'open')
    .gte('deadline', new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Africa/Addis_Ababa',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date()))
    .order('created_at', { ascending: false });
  if (internshipsError) {
    throw new Error(`Could not load this company's open internships: ${internshipsError.message}`);
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1 bg-gray-50">
        {/* Company header */}
        <div className="bg-white border-b">
          <div className="container mx-auto px-4 py-8 max-w-4xl">
            <div className="flex items-start gap-5">
              {company.logo_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={company.logo_url} alt={`${company.name} logo`} className="h-16 w-16 rounded-xl object-cover shrink-0" />
              ) : (
                <div className="w-16 h-16 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                  <Building2 className="h-8 w-8 text-indigo-600" />
                </div>
              )}
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                  <span className="flex items-center gap-1 text-sm text-green-600">
                    <ShieldCheck className="h-4 w-4" /> Verified
                  </span>
                </div>
                <div className="flex flex-wrap gap-4 mt-2 text-sm text-gray-500">
                  {company.industry && <span>{company.industry}</span>}
                  {company.size && (
                    <span className="flex items-center gap-1">
                      <Users className="h-3.5 w-3.5" />{company.size} employees
                    </span>
                  )}
                  {company.city && (
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />{company.city}
                    </span>
                  )}
                  {company.website && (
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1 text-indigo-600 hover:underline"
                    >
                      <Globe className="h-3.5 w-3.5" />Website
                    </a>
                  )}
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3.5 w-3.5" />{internships?.length ?? 0} open internship{internships?.length === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
            </div>
            {company.description && (
              <p className="mt-4 text-sm text-gray-600 leading-relaxed max-w-2xl">
                {company.description}
              </p>
            )}
          </div>
        </div>

        {/* Open internships */}
        <div className="container mx-auto px-4 py-8 max-w-4xl">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase className="h-5 w-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">
              Open Internships ({internships?.length ?? 0})
            </h2>
          </div>

          {internships && internships.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {internships.map((i) => (
                <InternshipCard
                  key={i.id}
                  internship={i as unknown as InternshipRow}
                  locale={locale}
                />
              ))}
            </div>
          ) : (
            <Card className="border-0 shadow-sm">
              <CardContent className="py-10 text-center text-gray-400 text-sm">
                No open internships at the moment. Check back soon.
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
