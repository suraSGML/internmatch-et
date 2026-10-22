import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { Briefcase } from 'lucide-react';

interface FooterProps {
  locale: string;
}

export function Footer({ locale }: FooterProps) {
  const t = useTranslations('footer');
  const tNav = useTranslations('nav');

  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-900 text-slate-300">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          {/* Brand column */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white font-bold text-lg">
              <Briefcase className="h-5 w-5 text-indigo-400" />
              InternMatch ET
            </div>
            <p className="text-sm text-slate-400 max-w-xs">
              Connecting Ethiopian students with meaningful internship opportunities.
            </p>
            <p className="text-xs text-slate-500">{t('madeIn')} 🇪🇹</p>
          </div>

          {/* Quick links */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {t('links')}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/${locale}/internships`} className="hover:text-white transition-colors">
                  {t('forStudents')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/for-companies`}
                  className="hover:text-white transition-colors"
                >
                  {t('forCompanies')}
                </Link>
              </li>
              <li>
                <Link
                  href={`/${locale}/for-universities`}
                  className="hover:text-white transition-colors"
                >
                  {t('forUniversities')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/about`} className="hover:text-white transition-colors">
                  {t('about')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/contact`} className="hover:text-white transition-colors">
                  {t('contact')}
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider mb-4">
              {t('legal')}
            </h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href={`/${locale}/terms`} className="hover:text-white transition-colors">
                  {t('terms')}
                </Link>
              </li>
              <li>
                <Link href={`/${locale}/privacy`} className="hover:text-white transition-colors">
                  {t('privacy')}
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-10 border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-500">
          <p>
            © {currentYear} InternMatch ET. {t('rights')}
          </p>
          <p>{t('madeIn')} 🇪🇹</p>
        </div>
      </div>
    </footer>
  );
}
