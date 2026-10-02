import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type { Profile } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  isPro: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  profile: null,
  isPro: false,
  loading: true,
  signOut: async () => {},
  refreshProfile: async () => {},
});

// Clear all BudgetIQ app data from localStorage
function clearLocalData() {
  const keys = Object.keys(localStorage).filter(k => k.startsWith('budgetiq_'));
  keys.forEach(k => localStorage.removeItem(k));
}

// Clear ALL Supabase session keys from localStorage
function clearSupabaseSession() {
  const keys = Object.keys(localStorage).filter(k =>
    k.startsWith('sb-') || k.includes('supabase')
  );
  keys.forEach(k => localStorage.removeItem(k));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();
    if (data) setProfile(data as Profile);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.id);
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchProfile(session.user.id);
      setLoading(false);
    });

    let previousUserId: string | null = null;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id ?? null;

      // Different user logged in — clear everything from previous user
      if (newUserId && previousUserId && newUserId !== previousUserId) {
        clearLocalData();
      }

      // On sign out, clear all local and session data
      if (event === 'SIGNED_OUT') {
        clearLocalData();
        clearSupabaseSession();
      }

      previousUserId = newUserId;
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) fetchProfile(session.user.id);
      else setProfile(null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signOut = async () => {
    clearLocalData();
    await supabase.auth.signOut();
    // Force clear any lingering session keys after signOut
    clearSupabaseSession();
  };

  return (
    <AuthContext.Provider value={{
      session,
      user,
      profile,
      isPro: profile?.is_pro ?? false,
      loading,
      signOut,
      refreshProfile,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);