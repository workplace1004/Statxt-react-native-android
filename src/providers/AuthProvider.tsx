import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { Session, User as SupabaseUser } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { supabase } from "../lib/supabase";
import { get2faToggle } from "../lib/api";
import type { User } from "../types/user";

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  requires2fa: boolean;
}

interface AuthContextValue extends AuthState {
  token: string | null;
  signIn: (email: string, password: string) => Promise<{ error?: string; requires2fa?: boolean }>;
  signInWithGoogle: () => Promise<{ error?: string; requires2fa?: boolean }>;
  signUp: (email: string, password: string, fullName: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
  complete2faVerification: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}

function mapSupabaseUserToUser(sbUser: SupabaseUser): User {
  return {
    id: sbUser.id,
    email: sbUser.email ?? undefined,
    full_name: (sbUser.user_metadata?.full_name as string) ?? undefined,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    isLoading: true,
    isAuthenticated: false,
    requires2fa: false,
  });

  const fetchUserProfile = useCallback(async (sbUser: SupabaseUser): Promise<User | null> => {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("id, email, full_name, avatar_url, organization_id, role")
        .eq("id", sbUser.id)
        .maybeSingle();
      if (error || !data) return mapSupabaseUserToUser(sbUser);
      return data as User;
    } catch {
      return mapSupabaseUserToUser(sbUser);
    }
  }, []);

  const fetch2faStatus = useCallback(async (accessToken: string): Promise<boolean> => {
    try {
      const res = await get2faToggle(accessToken);
      return !!res?.enabled;
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!mounted) return;
        if (session?.user) {
          const user = await fetchUserProfile(session.user);
          const requires2fa = await fetch2faStatus(session.access_token);
          if (!mounted) return;
          setState({
            session,
            user,
            isLoading: false,
            isAuthenticated: true,
            requires2fa,
          });
        } else {
          setState({
            session: null,
            user: null,
            isLoading: false,
            isAuthenticated: false,
            requires2fa: false,
          });
        }
      } catch (e) {
        console.error("[Auth] Init error:", e);
        if (mounted) setState((prev) => ({ ...prev, isLoading: false }));
      }
    };

    initAuth();

    // If init takes too long (e.g. network/Supabase down), show login so user isn't stuck on black screen
    timeoutId = setTimeout(() => {
      if (mounted) {
        setState((prev) => {
          if (!prev.isLoading) return prev;
          return {
            session: null,
            user: null,
            isLoading: false,
            isAuthenticated: false,
            requires2fa: false,
          };
        });
      }
    }, 8000);

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!mounted) return;
        if (event === "SIGNED_OUT" || !session) {
          setState({
            session: null,
            user: null,
            isLoading: false,
            isAuthenticated: false,
            requires2fa: false,
          });
          return;
        }
        if (session?.user && (event === "SIGNED_IN" || event === "TOKEN_REFRESHED")) {
          const user = await fetchUserProfile(session.user);
          const requires2fa = await fetch2faStatus(session.access_token);
          setState({
            session,
            user,
            isLoading: false,
            isAuthenticated: true,
            requires2fa,
          });
        }
      }
    );

    return () => {
      mounted = false;
      if (timeoutId) clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [fetchUserProfile, fetch2faStatus]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { error: error.message };
      if (!data.session?.user) return {};
      const user = await fetchUserProfile(data.session.user);
      const requires2fa = await fetch2faStatus(data.session.access_token);
      setState({
        session: data.session,
        user,
        isLoading: false,
        isAuthenticated: true,
        requires2fa,
      });
      return { requires2fa };
    } catch {
      return { error: "An unexpected error occurred" };
    }
  }, [fetchUserProfile, fetch2faStatus]);

  const signInWithGoogle = useCallback(async () => {
    try {
      const redirectUrl = Linking.createURL("auth/callback");
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });
      if (error) return { error: error.message };
      if (!data?.url) return { error: "Could not get Google sign-in URL" };

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);
      if (result.type !== "success" || !result.url) {
        if (result.type === "cancel" || result.type === "dismiss") return {};
        return { error: "Google sign-in was cancelled" };
      }

      const url = result.url;
      const hash = url.includes("#") ? url.split("#")[1] : "";
      const params = new URLSearchParams(hash);
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      if (!access_token || !refresh_token) {
        return { error: "Invalid sign-in response" };
      }

      const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      if (sessionError) return { error: sessionError.message };
      if (!sessionData.session?.user) return {};

      const user = await fetchUserProfile(sessionData.session.user);
      const requires2fa = await fetch2faStatus(sessionData.session.access_token);
      setState({
        session: sessionData.session,
        user,
        isLoading: false,
        isAuthenticated: true,
        requires2fa,
      });
      return { requires2fa };
    } catch (e) {
      console.error("[Auth] Google sign-in error:", e);
      return { error: e instanceof Error ? e.message : "Google sign-in failed" };
    }
  }, [fetchUserProfile, fetch2faStatus]);

  const signUp = useCallback(async (email: string, password: string, fullName: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });
      if (error) return { error: error.message };
      return {};
    } catch {
      return { error: "An unexpected error occurred" };
    }
  }, []);

  const signOut = useCallback(async () => {
    try {
      const signOutTimeout = new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error("Sign out timeout")), 5000)
      );
      await Promise.race([supabase.auth.signOut(), signOutTimeout]);
    } catch {
      // Clear Supabase session best-effort; we still clear app state below
    } finally {
      setState({
        session: null,
        user: null,
        isLoading: false,
        isAuthenticated: false,
        requires2fa: false,
      });
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const { data: { session } } = await supabase.auth.refreshSession();
    if (session?.user) {
      const user = await fetchUserProfile(session.user);
      setState((prev) => (prev.session ? { ...prev, user, session } : prev));
    }
  }, [fetchUserProfile]);

  const complete2faVerification = useCallback(() => {
    setState((prev) => (prev.isAuthenticated ? { ...prev, requires2fa: false } : prev));
  }, []);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        token: state.session?.access_token ?? null,
        signIn,
        signInWithGoogle,
        signUp,
        signOut,
        refreshSession,
        complete2faVerification,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
