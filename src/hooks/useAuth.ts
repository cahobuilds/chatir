'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [supabase]);

  const signOut = async () => {
    try {
      // Check if Supabase URL is configured
      if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
        console.error('Supabase URL not configured');
        // Still redirect to login even if Supabase is not configured
        router.push('/auth/login');
        router.refresh();
        return;
      }

      await supabase.auth.signOut();
      router.push('/auth/login');
      router.refresh();
    } catch (error) {
      console.error('Error signing out:', error);
      // Still redirect to login even if sign out fails
      router.push('/auth/login');
      router.refresh();
    }
  };

  return {
    user,
    loading,
    signOut,
  };
}

