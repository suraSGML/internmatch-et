import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, BookOpen, BarChart2, Bell, ShieldCheck, GraduationCap } from 'lucide-react';

export default async function ForUniversitiesPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1">
        <div className="bg-gradient-to-br from-purple-900 to-indigo-700 py-20 text-center">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Manage Student Placements Effortlessly
          </h1>
          <p className="text-indigo-200 max-w-xl mx-auto mb-8 text-sm leading-relaxed">
            InternMatch ET gives university coordinators the tools to approve placements,
            issue placement letters, monitor weekly logbooks, and export reports — all from
            one dashboard.
          </p>
          <Button asChild size="lg" className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold">
            <Link href={`/${locale}/contact`}>Contact Us to Onboard Your University</Link>
          </Button>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-4xl space-y-10">
          <section>
            <h2 className="text-xl font-bold text-gray-900 text-center mb-6">Coordinator Features</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { icon: ShieldCheck, title: 'Placement Approval', desc: 'Review and approve or reject student placement requests with a single click and optional rejection reason.' },
                { icon: FileText, title: 'Placement Letters', desc: 'Issue official introduction letters with a unique QR-verified code. Companies can verify authenticity online instantly.' },
                { icon: BookOpen, title: 'Logbook Monitoring', desc: 'View all submitted weekly logbook entries from your students across all active placements.' },
                { icon: BarChart2, title: 'Placement Reports', desc: 'See placement rate by department, companies hosting the most interns, and export data as CSV.' },
                { icon: Bell, title: 'Announcements', desc: 'Broadcast messages to all your students or filter by department — with a single post.' },
                { icon: GraduationCap, title: 'Student Tracking', desc: "See every student's placement status: searching, applied, interviewing, placed, completed." },
              ].map(({ icon: Icon, title, desc }) => (
                <Card key={title} className="border-0 shadow-sm">
                  <CardContent className="pt-4 pb-4">
                    <Icon className="h-6 w-6 text-purple-600 mb-2" />
                    <p className="font-semibold text-sm text-gray-900 mb-1">{title}</p>
                    <p className="text-xs text-gray-500 leading-relaxed">{desc}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          <section className="bg-purple-50 rounded-2xl p-8 text-center space-y-4">
            <h2 className="text-xl font-bold text-gray-900">Get Your University Onboard</h2>
            <p className="text-gray-500 text-sm max-w-lg mx-auto">
              University onboarding is handled by our team. Contact us and we&apos;ll set up your
              institution, add your departments, and invite your coordinators.
            </p>
            <Button asChild className="bg-indigo-600 hover:bg-indigo-700">
              <Link href={`/${locale}/contact`}>Contact Us</Link>
            </Button>
          </section>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
