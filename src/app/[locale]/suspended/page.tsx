import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SignOutButton } from './SignOutButton';

export default async function SuspendedAccountPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12">
      <section className="w-full max-w-lg space-y-5 rounded-xl border bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-50">
          <ShieldAlert className="h-7 w-7 text-red-600" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-gray-900">Account suspended</h1>
          <p className="text-sm leading-6 text-gray-600">
            An administrator has suspended access to this account. You cannot use InternMatch ET
            while the suspension is active. Contact support if you believe this is a mistake.
          </p>
        </div>
        <p className="text-sm text-gray-500">
          Support:{' '}
          <a className="text-indigo-600 hover:underline" href="mailto:admin@internmatch.et">
            admin@internmatch.et
          </a>
        </p>
        <div className="flex flex-col justify-center gap-3 sm:flex-row">
          <SignOutButton locale={locale} />
          <Button variant="outline" asChild>
            <Link href={`/${locale}/login`}>Go to sign in</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
