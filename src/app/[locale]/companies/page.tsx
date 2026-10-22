import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building2, MapPin, Briefcase, ShieldCheck } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function CompaniesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const supabase = await createClient();

  const { data: companies } = await supabase
    .from('companies')
    .select('id, name, slug, description, industry, size, city, logo_url, status')
    .eq('status', 'verified')
    .order('name');

  // Get open internship count per company
  const { data: openCounts } = await supabase
    .from('internships')
    .select('company_id')
    .eq('status', 'open');

  const countMap = (openCounts ?? []).reduce<Record<string, number>>((acc, { company_id }) => {
    acc[company_id] = (acc[company_id] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1 bg-gray-50">
        <div className="bg-indigo-700 py-8">
          <div className="container mx-auto px-4">
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Building2 className="h-6 w-6" />
              Companies
            </h1>
            <p className="text-indigo-200 text-sm mt-1">
              {companies?.length ?? 0} verified companies on InternMatch ET
            </p>
          </div>
        </div>

        <div className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {(companies ?? []).map((company) => (
              <Link key={company.id} href={`/${locale}/companies/${company.slug}`}>
                <Card className="border-0 shadow-sm hover:shadow-md transition-shadow h-full">
                  <CardContent className="pt-5 pb-5 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="w-11 h-11 bg-indigo-100 rounded-xl flex items-center justify-center shrink-0">
                        <Building2 className="h-5 w-5 text-indigo-600" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-gray-900 truncate">{company.name}</p>
                          <ShieldCheck className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        </div>
                        {company.industry && (
                          <p className="text-xs text-gray-500 truncate">{company.industry}</p>
                        )}
                      </div>
                    </div>

                    {company.description && (
                      <p className="text-xs text-gray-600 line-clamp-2">{company.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div className="flex flex-wrap gap-2">
                        {company.city && (
                          <span className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin className="h-3 w-3" />{company.city}
                          </span>
                        )}
                        {company.size && (
                          <span className="text-xs text-gray-400">{company.size} employees</span>
                        )}
                      </div>
                      {(countMap[company.id] ?? 0) > 0 && (
                        <Badge className="bg-indigo-100 text-indigo-700 hover:bg-indigo-100 text-xs gap-1">
                          <Briefcase className="h-3 w-3" />
                          {countMap[company.id]} open
                        </Badge>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>

          {!companies?.length && (
            <div className="text-center py-16 text-gray-400">
              <Building2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>No verified companies yet.</p>
            </div>
          )}
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
