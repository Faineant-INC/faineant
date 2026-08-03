"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AuthContext, type AuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const [userResult, sessionResult] = await Promise.all([
      supabase.auth.getUser(),
      supabase.auth.getSession(),
    ]);
    if (userResult.error || sessionResult.error) {
      setUser(null);
      setAccessToken(null);
      return null;
    }
    const authUser = userResult.data.user;
    setAccessToken(sessionResult.data.session?.access_token ?? null);
    if (!authUser) {
      setUser(null);
      setAccessToken(null);
      return null;
    }
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("role, first_name, last_name, is_active")
      .eq("id", authUser.id)
      .maybeSingle();
    if (profileError || !profile?.is_active) {
      await supabase.auth.signOut({ scope: "local" });
      setUser(null);
      setAccessToken(null);
      return null;
    }
    const nextUser: AuthUser = {
      id: authUser.id,
      email: authUser.email ?? "",
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      role: profile.role as AuthUser["role"],
      emailVerified: !!authUser.email_confirmed_at,
    };
    setUser(nextUser);
    return nextUser;
  }, [supabase]);

  useEffect(() => {
    loadUser()
      .catch(() => {
        setUser(null);
        setAccessToken(null);
      })
      .finally(() => setIsLoading(false));
    const {
      data: sub,
    } = supabase.auth.onAuthStateChange(() => {
      window.setTimeout(() => void loadUser(), 0);
    });
    return () => sub.subscription.unsubscribe();
  }, [loadUser, supabase]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw new Error(error.message);
      const authenticatedUser = await loadUser();
      if (!authenticatedUser) throw new Error("Account profile is unavailable.");
    },
    [supabase, loadUser],
  );

  const register = useCallback(
    async (data: Record<string, string>) => {
      const { email, password, firstName, lastName, role, phone } = data;
      const { data: signUpData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role: role ?? "CLIENT",
            phone,
          },
        },
      });
      if (error) throw new Error(error.message);
      if (!signUpData.session) {
        setUser(null);
        setAccessToken(null);
        return { requiresEmailConfirmation: true };
      }
      const authenticatedUser = await loadUser();
      if (!authenticatedUser) throw new Error("Account profile is unavailable.");
      return { requiresEmailConfirmation: false };
    },
    [supabase, loadUser],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    setAccessToken(null);
    window.location.href = "/login";
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ user, accessToken, login, register, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}
