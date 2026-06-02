"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AuthContext, type AuthUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/client";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser) {
      setUser(null);
      return;
    }
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, first_name, last_name")
      .eq("id", authUser.id)
      .maybeSingle();
    setUser({
      id: authUser.id,
      email: authUser.email ?? "",
      firstName: profile?.first_name ?? "",
      lastName: profile?.last_name ?? "",
      role: (profile?.role as AuthUser["role"]) ?? "CLIENT",
      emailVerified: !!authUser.email_confirmed_at,
    });
  }, [supabase]);

  useEffect(() => {
    loadUser().finally(() => setIsLoading(false));
    const {
      data: sub,
    } = supabase.auth.onAuthStateChange(() => {
      loadUser();
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
      await loadUser();
    },
    [supabase, loadUser],
  );

  const register = useCallback(
    async (data: Record<string, string>) => {
      const { email, password, firstName, lastName, role, phone } = data;
      const { error } = await supabase.auth.signUp({
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
      await loadUser();
    },
    [supabase, loadUser],
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
    window.location.href = "/login";
  }, [supabase]);

  return (
    <AuthContext.Provider
      value={{ user, accessToken: null, login, register, logout, isLoading }}
    >
      {children}
    </AuthContext.Provider>
  );
}
