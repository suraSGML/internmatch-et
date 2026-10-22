import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Users, BarChart2, Award, Shield, Star } from 'lucide-react';

export default async function ForCompaniesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1">
        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-900 to-indigo-600 py-20 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Find Ethiopia&apos;s Best Intern Talent
          </h1>
          <p className="text-indigo-200 max-w-xl mx-auto mb-8 text-sm leading-relaxed">
            Post internships for free, review applicants ranked by match score, and manage your
            entire intern programme — from offer to certificate — in one place.
          </p>
          <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold">
            <Link href={`/${locale}/register`}>Get Started Free</Link>
          </Button>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-4xl space-y-12">
          {/* Benefits */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Why InternMatch ET?</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: Users, title: 'Qualified Candidates', desc: 'Access hundreds of students from universities across Ethiopia, pre-screened by their institutions.' },
                { icon: Star, title: 'Match Score Ranking', desc: 'Applicants ranked automatically by skill overlap, department match, and availability fit.' },
                { icon: BarChart2, title: 'Pipeline Management', desc: 'Kanban board, bulk status updates, interview scheduling, and offer management — all in one dashboard.' },
                { icon: Award, title: 'Verifiable Certificates', desc: 'Issue QR-coded completion certificates that students can share and employers can verify online.' },
                { icon: Shield, title: 'Verified Badge', desc: 'Your company gets a verified badge after admin review, building trust with students and universities.' },
                { icon: CheckCircle2, title: 'University Partnership', desc: 'Coordinate directly with university coordinators for placement approval and official letters.' },
              ].map(({ icon: Icon, title, desc }) => (
                <Card key={title} className="border-0 shadow-sm">
                  <CardContent className="pt-4 pb-4">
                    <Icon className="h-6 w-6 text-indigo-600 mb-2" />
                    <p className="font-semibold text-sm text-gray-900 mb-1">{title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* How it works */}
          <section className="bg-indigo-50 rounded-2xl p-8">
            <h2 className="text-xl font-bold text-gray-900 text-center mb-6">How It Works</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {[
                { step: 1, title: 'Create & Verify', desc: 'Register your company, upload your registration documents, and get verified by our team.' },
                { step: 2, title: 'Post & Attract', desc: 'Create detailed internship listings. Students receive smart match scores before applying.' },
                { step: 3, title: 'Hire & Manage', desc: 'Review ranked applicants, schedule interviews, send offers, track logbooks, and issue certificates.' },
              ].map(({ step, title, desc }) => (
                <div key={step} className="text-center">
                  <div className="w-10 h-10 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold mx-auto mb-3">
                    {step}
                  </div>
                  <p className="font-semibold text-gray-900 mb-1">{title}</p>
                  <p className="text-xs text-gray-500">{desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Ready to find your next intern?</h2>
            <p className="text-gray-500 text-sm">Registration and posting are completely free.</p>
            <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700">
              <Link href={`/${locale}/register`}>Register Your Company</Link>
            </Button>
          </section>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
