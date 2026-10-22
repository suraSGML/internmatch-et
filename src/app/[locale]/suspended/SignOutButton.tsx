'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';

export function SignOutButton({ locale }: { locale: string }) {
  const router = useRouter();
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut({ scope: 'local' });
    router.replace(`/${locale}/login`);
    router.refresh();
  };

  return (
    <Button onClick={handleSignOut} disabled={isSigningOut}>
      {isSigningOut ? 'Signing out…' : 'Sign out'}
    </Button>
  );
}
