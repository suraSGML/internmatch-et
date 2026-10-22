import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { UserCircle, Search, CheckCircle2, Briefcase, Star, Users } from 'lucide-react';

export default async function HowItWorksPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1 bg-gray-50">
        <div className="bg-indigo-700 py-14 text-center">
          <h1 className="text-3xl font-bold text-white">How InternMatch ET Works</h1>
          <p className="text-indigo-200 mt-2 text-sm">From profile to placement in a few simple steps.</p>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-3xl space-y-14">
          {/* Students */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">For Students</h2>
            <div className="space-y-6">
              {[
                { step: 1, icon: UserCircle, title: 'Create Your Profile', desc: 'Sign up, complete your profile with skills, university, and availability. Build your CV using our PDF generator or upload your own.' },
                { step: 2, icon: Search, title: 'Discover Internships', desc: 'Browse open internships filtered by field, city, duration, and pay. See your personal match score for each listing before you apply.' },
                { step: 3, icon: Briefcase, title: 'Apply with One Click', desc: 'Write a cover note, answer screening questions, and attach your CV. Track every application in real time.' },
                { step: 4, icon: CheckCircle2, title: 'Get Placed & Grow', desc: 'Accept your offer, get university approval, write weekly logbook entries, receive a supervisor evaluation, and earn a verifiable completion certificate.' },
              ].map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shrink-0">{step}</div>
                    {step < 4 && <div className="w-px flex-1 bg-indigo-200 mt-2" />}
                  </div>
                  <div className="pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-indigo-500" />
                      <h3 className="font-semibold text-gray-900">{title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Companies */}
          <section>
            <h2 className="text-xl font-bold text-gray-900 mb-6 text-center">For Companies</h2>
            <div className="space-y-6">
              {[
                { step: 1, icon: Briefcase, title: 'Register & Get Verified', desc: 'Create your company profile and upload your registration documents. Our team verifies you and grants your verified badge.' },
                { step: 2, icon: Star, title: 'Post Internships', desc: 'Create detailed listings with skills, duration, location, pay, and screening questions. Published immediately to thousands of students.' },
                { step: 3, icon: Users, title: 'Review & Select', desc: 'See applicants ranked by match score. Move them through your pipeline, schedule interviews, and send offers — all in one place.' },
                { step: 4, icon: CheckCircle2, title: 'Manage & Certify', desc: 'Review weekly logbooks, submit evaluations, and issue verified digital certificates when the internship is complete.' },
              ].map(({ step, icon: Icon, title, desc }) => (
                <div key={step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-9 h-9 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold shrink-0">{step}</div>
                    {step < 4 && <div className="w-px flex-1 bg-amber-200 mt-2" />}
                  </div>
                  <div className="pb-6">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className="h-4 w-4 text-amber-500" />
                      <h3 className="font-semibold text-gray-900">{title}</h3>
                    </div>
                    <p className="text-sm text-gray-600">{desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <div className="text-center">
            <Button asChild size="lg" className="bg-indigo-600 hover:bg-indigo-700">
              <Link href={`/${locale}/register`}>Get Started Free</Link>
            </Button>
          </div>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
