'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';
import type { UserRole } from '@/types';

interface UseUserReturn {
  user: User | null;
  role: UserRole | null;
  loading: boolean;
}

/**
 * Returns the current authenticated user and their role.
 * Role is stored in user_metadata.role at registration.
 */
export function useUser(): UseUserReturn {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    // Get initial user
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      setRole((data.user?.user_metadata?.role as UserRole) ?? null);
      setLoading(false);
    });

    // Listen for auth state changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setRole((session?.user?.user_metadata?.role as UserRole) ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  return { user, role, loading };
}
