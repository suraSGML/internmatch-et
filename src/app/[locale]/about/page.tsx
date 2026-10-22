import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Briefcase, Users, GraduationCap, Building2, Shield, Globe } from 'lucide-react';

export default async function AboutPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-indigo-700 py-16 text-center">
          <h1 className="text-3xl font-bold text-white mb-3">About InternMatch ET</h1>
          <p className="text-indigo-200 max-w-xl mx-auto text-sm leading-relaxed">
            Ethiopia&apos;s first dedicated internship matching, tracking, and placement platform —
            connecting students, companies, and universities in one trusted place.
          </p>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-3xl space-y-10">
          {/* Mission */}
          <section className="text-center space-y-3">
            <h2 className="text-xl font-bold text-gray-900">Our Mission</h2>
            <p className="text-gray-600 leading-relaxed">
              We believe every Ethiopian student deserves access to a meaningful internship that
              builds their career. InternMatch ET removes the friction from the placement process —
              giving students smart matching tools, giving companies a pipeline of qualified talent,
              and giving universities the oversight they need to support their students.
            </p>
          </section>

          {/* What makes us different */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-5 text-center">What Makes Us Different</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {[
                { icon: Shield, title: 'Verified Companies', desc: 'Every company is verified by our team before posting internships.' },
                { icon: GraduationCap, title: 'University Integration', desc: 'Coordinators approve placements, issue letters, and track progress.' },
                { icon: Globe, title: 'Built for Ethiopia', desc: 'ETB currency, Ethiopian cities, Amharic language — designed for the local context.' },
                { icon: Users, title: 'Smart Matching', desc: 'Our algorithm ranks internships and applicants based on skills, location, and availability.' },
              ].map(({ icon: Icon, title, desc }) => (
                <Card key={title} className="border-0 shadow-sm">
                  <CardContent className="pt-4 pb-4 flex gap-3">
                    <div className="w-9 h-9 bg-indigo-100 rounded-lg flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{title}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{desc}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Stats */}
          <section className="bg-indigo-50 rounded-2xl p-6 grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
            {[
              { label: 'Students', value: '500+' },
              { label: 'Companies', value: '100+' },
              { label: 'Universities', value: '50+' },
              { label: 'Placements', value: '200+' },
            ].map(({ label, value }) => (
              <div key={label}>
                <p className="text-2xl font-bold text-indigo-700">{value}</p>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
            ))}
          </section>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
