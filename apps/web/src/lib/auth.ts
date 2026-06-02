"use client";

import { createContext, useContext } from "react";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  emailVerified?: boolean;
}

export interface AuthContextValue {
  user: AuthUser | null;
  // Temporary: legacy Express-backed pages still read `accessToken` from the
  // bearer token. Supabase manages sessions via cookies, so this is always
  // null. Remove once those pages migrate to supabase data fetching.
  accessToken: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (data: Record<string, string>) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextValue>({
  user: null,
  accessToken: null,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  isLoading: true,
});

export const useAuth = () => useContext(AuthContext);
