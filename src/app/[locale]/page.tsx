import { useTranslations } from 'next-intl';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FadeUp, FadeIn, StaggerList, StaggerItem, ScaleIn, HoverLift,
} from '@/components/shared/animations';
import {
  UserCircle, Search, CheckCircle, Briefcase,
  Star, Users, BookOpen, Building2, GraduationCap,
} from 'lucide-react';

interface HomePageProps {
  params: Promise<{ locale: string }>;
}

const STATS = [
  { key: 'statsStudents',     value: '500+', icon: GraduationCap },
  { key: 'statsCompanies',    value: '100+', icon: Building2 },
  { key: 'statsUniversities', value: '50+',  icon: BookOpen },
  { key: 'statsInternships',  value: '200+', icon: Briefcase },
];

const STUDENT_STEPS = [
  { key: 'step1Student', descKey: 'step1StudentDesc', icon: UserCircle, step: 1 },
  { key: 'step2Student', descKey: 'step2StudentDesc', icon: Search,     step: 2 },
  { key: 'step3Student', descKey: 'step3StudentDesc', icon: CheckCircle, step: 3 },
];

const COMPANY_STEPS = [
  { key: 'step1Company', descKey: 'step1CompanyDesc', icon: Briefcase, step: 1 },
  { key: 'step2Company', descKey: 'step2CompanyDesc', icon: Star,      step: 2 },
  { key: 'step3Company', descKey: 'step3CompanyDesc', icon: Users,     step: 3 },
];

export default async function HomePage({ params }: HomePageProps) {
  const { locale } = await params;

  // Determine the logged-in user's role for role-aware CTAs
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userRole: string | null = null;
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    userRole = profile?.role ?? (user.user_metadata?.role as string | null) ?? null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1">
        <HeroSection locale={locale} userRole={userRole} />
        <StatsSection />
        <HowItWorksSection locale={locale} />
        <CTASection locale={locale} userRole={userRole} />
      </main>
      <Footer locale={locale} />
    </div>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ locale, userRole }: { locale: string; userRole: string | null }) {
  const t = useTranslations('home');

  // Role-aware CTA buttons
  type CtaButton = { label: string; href: string; primary: boolean };

  const ctaButtons: CtaButton[] = (() => {
    switch (userRole) {
      case 'student':
        return [
          { label: 'Browse Internships', href: `/${locale}/internships`, primary: true },
          { label: 'My Applications', href: `/${locale}/student/applications`, primary: false },
        ];
      case 'company':
        return [
          { label: 'Post an Internship', href: `/${locale}/company/internships/new`, primary: true },
          { label: 'My Dashboard', href: `/${locale}/company/dashboard`, primary: false },
        ];
      case 'university':
        return [
          { label: 'View Internships', href: `/${locale}/internships`, primary: true },
          { label: 'My Dashboard', href: `/${locale}/university/dashboard`, primary: false },
        ];
      case 'admin':
        return [
          { label: 'Admin Dashboard', href: `/${locale}/admin`, primary: true },
          { label: 'Manage Companies', href: `/${locale}/admin/companies`, primary: false },
        ];
      default:
        // Unauthenticated visitor
        return [
          { label: t('browseInternships'), href: `/${locale}/internships`, primary: true },
          { label: t('postInternship'), href: `/${locale}/for-companies`, primary: false },
        ];
    }
  })();

  return (
    <section className="relative bg-gradient-to-br from-indigo-900 via-indigo-700 to-indigo-600 py-20 md:py-28 overflow-hidden">
      {/* Background blobs */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-10 left-10 w-72 h-72 bg-white rounded-full blur-3xl" />
        <div className="absolute bottom-10 right-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl" />
      </div>

      <div className="container mx-auto px-4 relative z-10 text-center">
        <FadeIn>
          <div className="inline-flex items-center gap-2 bg-white/10 text-white/90 text-sm px-4 py-1.5 rounded-full mb-6 backdrop-blur">
            <span className="w-2 h-2 bg-amber-400 rounded-full animate-pulse" />
            Ethiopia&apos;s #1 Internship Platform
          </div>
        </FadeIn>

        <FadeUp delay={0.08}>
          <h1 className="text-3xl md:text-5xl font-bold text-white leading-tight mb-6 max-w-3xl mx-auto">
            {t('heroTitle')}
          </h1>
        </FadeUp>

        <FadeUp delay={0.16}>
          <p className="text-indigo-100 text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('heroSubtitle')}
          </p>
        </FadeUp>

        <FadeUp delay={0.24}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {ctaButtons.map(({ label, href, primary }) => (
              <Button
                key={href}
                size="lg"
                variant={primary ? 'default' : 'outline'}
                asChild
                className={
                  primary
                    ? 'bg-white text-indigo-700 hover:bg-indigo-50 font-semibold px-8'
                    : 'border-white text-white hover:bg-white/10 font-semibold px-8'
                }
              >
                <Link href={href}>{label}</Link>
              </Button>
            ))}
          </div>
        </FadeUp>
      </div>
    </section>
  );
}

// ─── Stats ────────────────────────────────────────────────────────────────────

function StatsSection() {
  const t = useTranslations('home');
  return (
    <section className="bg-white border-b">
      <div className="container mx-auto px-4 py-10">
        <StaggerList className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {STATS.map(({ key, value, icon: Icon }) => (
            <StaggerItem key={key}>
              <HoverLift className="flex flex-col items-center text-center gap-2 cursor-default">
                <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                  <Icon className="h-6 w-6 text-indigo-600" />
                </div>
                <span className="text-2xl font-bold text-indigo-700">{value}</span>
                <span className="text-sm text-gray-500">
                  {t(key as Parameters<typeof t>[0])}
                </span>
              </HoverLift>
            </StaggerItem>
          ))}
        </StaggerList>
      </div>
    </section>
  );
}

// ─── How It Works ──────────────────────────────────────────────────────────────

function HowItWorksSection({ locale }: { locale: string }) {
  const t = useTranslations('home');
  return (
    <section className="py-16 md:py-24 bg-gray-50">
      <div className="container mx-auto px-4">
        <FadeUp>
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-3">
              {t('howItWorks')}
            </h2>
            <p className="text-gray-500 max-w-xl mx-auto">{t('howItWorksSubtitle')}</p>
          </div>
        </FadeUp>

        <Tabs defaultValue="students" className="max-w-3xl mx-auto">
          <FadeUp delay={0.1}>
            <TabsList className="grid w-full grid-cols-2 mb-8">
              <TabsTrigger value="students">{t('forStudents')}</TabsTrigger>
              <TabsTrigger value="companies">{t('forCompanies')}</TabsTrigger>
            </TabsList>
          </FadeUp>

          <TabsContent value="students">
            <StaggerList className="grid gap-6 md:grid-cols-3">
              {STUDENT_STEPS.map(({ key, descKey, icon: Icon, step }) => (
                <StaggerItem key={key}>
                  <StepCard
                    step={step}
                    title={t(key as Parameters<typeof t>[0])}
                    description={t(descKey as Parameters<typeof t>[0])}
                    icon={Icon}
                  />
                </StaggerItem>
              ))}
            </StaggerList>
          </TabsContent>

          <TabsContent value="companies">
            <StaggerList className="grid gap-6 md:grid-cols-3">
              {COMPANY_STEPS.map(({ key, descKey, icon: Icon, step }) => (
                <StaggerItem key={key}>
                  <StepCard
                    step={step}
                    title={t(key as Parameters<typeof t>[0])}
                    description={t(descKey as Parameters<typeof t>[0])}
                    icon={Icon}
                  />
                </StaggerItem>
              ))}
            </StaggerList>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}

function StepCard({
  step,
  title,
  description,
  icon: Icon,
}: {
  step: number;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <HoverLift>
      <Card className="relative overflow-hidden border-0 shadow-sm hover:shadow-md transition-shadow h-full">
        <CardContent className="pt-6 pb-6">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center text-sm font-bold shrink-0">
              {step}
            </div>
            <Icon className="h-5 w-5 text-indigo-500" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-500 leading-relaxed">{description}</p>
        </CardContent>
      </Card>
    </HoverLift>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────

function CTASection({ locale, userRole }: { locale: string; userRole: string | null }) {
  const t = useTranslations('home');

  const getCtaContent = () => {
    switch (userRole) {
      case 'company':
        return {
          title: 'Ready to find your next great intern?',
          subtitle: 'Create new listings, review applicants ranked by match score, and issue verified certificates.',
          primary: { label: 'Post an Internship', href: `/${locale}/company/internships/new` },
          secondary: { label: 'Go to Dashboard', href: `/${locale}/company/dashboard` },
        };
      case 'student':
        return {
          title: 'Ready to launch your career?',
          subtitle: 'Discover top internships matching your university, department, and skills.',
          primary: { label: 'Browse Internships', href: `/${locale}/internships` },
          secondary: { label: 'My Applications', href: `/${locale}/student/applications` },
        };
      case 'university':
        return {
          title: 'Manage Student Placements',
          subtitle: 'Oversee student internships, approve placements, and track evaluations in one place.',
          primary: { label: 'University Dashboard', href: `/${locale}/university/dashboard` },
          secondary: { label: 'View Placements', href: `/${locale}/university/placements` },
        };
      case 'admin':
        return {
          title: 'Manage InternMatch ET',
          subtitle: 'Review verification requests, monitor platform activity, and manage users.',
          primary: { label: 'Admin Dashboard', href: `/${locale}/admin` },
          secondary: { label: 'Review Universities', href: `/${locale}/admin/universities` },
        };
      default:
        return {
          title: t('ctaTitle'),
          subtitle: t('ctaSubtitle'),
          primary: { label: t('ctaStudent'), href: `/${locale}/register?role=student` },
          secondary: { label: t('ctaCompany'), href: `/${locale}/register?role=company` },
        };
    }
  };

  const cta = getCtaContent();

  return (
    <section className="bg-indigo-700 py-16">
      <div className="container mx-auto px-4 text-center">
        <FadeUp>
          <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">{cta.title}</h2>
          <p className="text-indigo-200 mb-8 max-w-xl mx-auto">{cta.subtitle}</p>
        </FadeUp>
        <FadeUp delay={0.1}>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button
              size="lg"
              asChild
              className="bg-white text-indigo-700 hover:bg-indigo-50 font-semibold"
            >
              <Link href={cta.primary.href}>{cta.primary.label}</Link>
            </Button>
            <Button
              size="lg"
              variant="outline"
              asChild
              className="border-white text-white hover:bg-white/10 font-semibold"
            >
              <Link href={cta.secondary.href}>{cta.secondary.label}</Link>
            </Button>
          </div>
        </FadeUp>
      </div>
    </section>
  );
}
