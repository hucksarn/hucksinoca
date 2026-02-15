import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { isLocalMode, authApi, setAuthToken, getAuthToken, type AuthUser } from '@/lib/api';

// Only import supabase types/client when in cloud mode
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'admin' | 'user';

interface Profile {
  id: string;
  user_id: string;
  full_name: string;
  designation: string;
  phone: string | null;
  must_change_password: boolean;
}

interface AuthContextType {
  user: User | AuthUser | null;
  session: Session | null;
  profile: Profile | null;
  role: AppRole | null;
  isAdmin: boolean;
  mustChangePassword: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ──────── LOCAL AUTH PROVIDER ────────

function LocalAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getAuthToken();
    if (token) {
      authApi.me()
        .then((u) => setUser(u))
        .catch(() => {
          setAuthToken(null);
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const result = await authApi.login(email, password);
      setAuthToken(result.token);
      setUser(result.user);
      return { error: null };
    } catch (err: any) {
      return { error: new Error(err.message || 'Login failed') };
    }
  };

  const signOut = async () => {
    authApi.logout();
    setUser(null);
  };

  const refreshProfile = async () => {
    try {
      const u = await authApi.me();
      setUser(u);
    } catch {
      // ignore
    }
  };

  const profile: Profile | null = user
    ? {
        id: user.id,
        user_id: user.id,
        full_name: user.full_name,
        designation: user.designation,
        phone: user.phone,
        must_change_password: user.must_change_password,
      }
    : null;

  return (
    <AuthContext.Provider
      value={{
        user: user as any,
        session: null,
        profile,
        role: user?.role || null,
        isAdmin: user?.role === 'admin',
        mustChangePassword: user?.must_change_password ?? false,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ──────── CLOUD AUTH PROVIDER ────────

function CloudAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      const { supabase } = await import('@/integrations/supabase/client');

      const { data: { subscription } } = supabase.auth.onAuthStateChange(
        (_event, session) => {
          if (!mounted) return;
          setSession(session);
          setUser(session?.user ?? null);
          if (session?.user) {
            setTimeout(() => {
              if (mounted) fetchProfileAndRole(session.user.id);
            }, 0);
          } else {
            setProfile(null);
            setRole(null);
            setLoading(false);
          }
        }
      );

      const { data: { session: existingSession } } = await supabase.auth.getSession();
      if (!mounted) return;
      setSession(existingSession);
      setUser(existingSession?.user ?? null);
      if (existingSession?.user) {
        fetchProfileAndRole(existingSession.user.id);
      } else {
        setLoading(false);
      }

      return () => {
        mounted = false;
        subscription.unsubscribe();
      };
    };

    initAuth();
    return () => { mounted = false; };
  }, []);

  const fetchProfileAndRole = async (userId: string) => {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      const { data: profileData } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_id', userId)
        .single();
      if (profileData) setProfile(profileData as Profile);

      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .single();
      if (roleData) setRole(roleData.role as AppRole);
    } catch (error) {
      console.error('Error fetching profile/role:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshProfile = async () => {
    if (user) await fetchProfileAndRole(user.id);
  };

  const signIn = async (email: string, password: string) => {
    const { supabase } = await import('@/integrations/supabase/client');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    const { supabase } = await import('@/integrations/supabase/client');
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setRole(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        role,
        isAdmin: role === 'admin',
        mustChangePassword: profile?.must_change_password ?? false,
        loading,
        signIn,
        signOut,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ──────── EXPORTED PROVIDER ────────

export function AuthProvider({ children }: { children: ReactNode }) {
  if (isLocalMode) {
    return <LocalAuthProvider>{children}</LocalAuthProvider>;
  }
  return <CloudAuthProvider>{children}</CloudAuthProvider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
