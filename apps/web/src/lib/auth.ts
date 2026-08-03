"use client";

import { createContext, useContext } from "react";
import type { AppRole } from "@/lib/auth.matcher";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: AppRole;
  emailVerified?: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  // Exposed for authenticated UI gating and Edge Function calls. Data access
  // itself is handled by the Supabase client and its persisted session.
  accessToken: string | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (data: Record<string, string>) => Promise<{
    requiresEmailConfirmation: boolean;
  }>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  login: async () => {
    throw new Error("AuthProvider is not mounted.");
  },
  register: async () => ({ requiresEmailConfirmation: false }),
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);
