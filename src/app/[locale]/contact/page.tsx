import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, Phone, MapPin } from 'lucide-react';

export default async function ContactPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar locale={locale} />
      <main className="flex-1 bg-gray-50">
        <div className="bg-indigo-700 py-12 text-center">
          <h1 className="text-3xl font-bold text-white">Contact Us</h1>
          <p className="text-indigo-200 mt-2 text-sm">We&apos;re here to help.</p>
        </div>
        <div className="container mx-auto px-4 py-10 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            {[
              { icon: Mail, label: 'Email', value: 'support@internmatch.et' },
              { icon: Phone, label: 'Phone', value: '+251 11 000 0000' },
              { icon: MapPin, label: 'Location', value: 'Addis Ababa, Ethiopia' },
            ].map(({ icon: Icon, label, value }) => (
              <Card key={label} className="border-0 shadow-sm text-center">
                <CardContent className="pt-5 pb-5">
                  <Icon className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-400 mb-0.5">{label}</p>
                  <p className="text-sm font-medium text-gray-800">{value}</p>
                </CardContent>
              </Card>
            ))}
          </div>
          <Card className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-5">
              <p className="text-sm text-gray-600 text-center">
                For partnership inquiries, university onboarding, or technical support,
                email us at <a href="mailto:support@internmatch.et" className="text-indigo-600 hover:underline">support@internmatch.et</a>.
                We typically respond within one business day.
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer locale={locale} />
    </div>
  );
}
