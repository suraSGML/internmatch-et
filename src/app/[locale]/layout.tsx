import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing } from '@/i18n/routing';
import { Toaster } from 'sonner';
import { QueryProvider } from '@/components/shared/QueryProvider';
import '../globals.css';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

export async function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'app' });
  return {
    title: {
      default: t('name'),
      template: `%s | ${t('name')}`,
    },
    description: t('tagline'),
    openGraph: {
      title: t('name'),
      description: t('tagline'),
      locale,
      type: 'website',
    },
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Validate locale
  if (!routing.locales.includes(locale as (typeof routing.locales)[number])) {
    notFound();
  }

  const messages = await getMessages();

  return (
    <div className={`${inter.variable} ${inter.className} min-h-screen`}>
      <NextIntlClientProvider messages={messages}>
        <QueryProvider>
          {children}
        </QueryProvider>
        <Toaster position="top-right" richColors />
      </NextIntlClientProvider>
    </div>
  );
}
