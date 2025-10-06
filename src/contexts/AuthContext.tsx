import React, { createContext, useContext, useEffect, useState } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

// Define a base profile interface
interface BaseProfile {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  avatar_url?: string;
}

// Driver-specific profile extension
interface DriverProfile extends BaseProfile {
  role: "driver";
  kyc_status?: "approved" | "pending" | "rejected" | null;
  average_rating?: number;
  total_ratings?: number;
  kyc_completed_at?: string;
}

// Passenger-specific profile extension
interface PassengerProfile extends BaseProfile {
  role: "passenger";
}

// Union type for Profile
type Profile = DriverProfile | PassengerProfile;

interface AuthContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    role: "driver" | "passenger"
  ) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  updatePassword: (password: string) => Promise<{ error: any }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initializeAuth = async () => {
      try {
        // Check for existing session
        const { data: sessionData, error: sessionError } =
          await supabase.auth.getSession();
        if (sessionError) throw sessionError;

        if (mounted) {
          setSession(sessionData.session);
          setUser(sessionData.session?.user ?? null);

          if (sessionData.session?.user) {
            // Fetch user profile synchronously
            const { data: profileData, error: profileError } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", sessionData.session.user.id)
              .single();
            if (profileError) throw profileError;
            setProfile(profileData);
          } else {
            setProfile(null);
          }
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
        if (mounted) {
          setUser(null);
          setProfile(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
  (event, session) => {
    if (mounted) {
      setSession(session);
      setUser(session?.user ?? null);

      if (session?.user) {
        (async () => {
          try {
            const { data, error } = await supabase
              .from("profiles")
              .select("*")
              .eq("id", session.user.id)
              .single();

            if (mounted) {
              if (!error) setProfile(data);
              else setProfile(null);
            }
          } catch (err) {
            console.error("Profile fetch error:", err);
            if (mounted) setProfile(null);
          }
        })();
      } else {
        setProfile(null);
      }

      setLoading(false); // Ensure loading is false after state change
    }
  }
);

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error };
  };

  const signUp = async (
    email: string,
    password: string,
    fullName: string,
    role: "driver" | "passenger"
  ) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });
    return { error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    return { error };
  };

  const updatePassword = async (password: string) => {
    const { error } = await supabase.auth.updateUser({ password });
    return { error };
  };

  const refreshProfile = async () => {
    if (user?.id) {
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      if (profileError) throw profileError;
      setProfile(profileData);
    }
  };

  const value = {
    user,
    session,
    profile,
    loading,
    signIn,
    signUp,
    signOut,
    resetPassword,
    updatePassword,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};