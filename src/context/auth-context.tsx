// src/context/auth-context.tsx

"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LoginResponse, User } from "@/lib/types";
import { clearAuth, loadAuth, saveAuth } from "@/lib/auth-storage"; // << IMPORTANT
import { loginRequest } from "@/lib/api-client";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
}

export const AuthContext = createContext<AuthContextValue | undefined>(
  undefined
);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const { token: storedToken, user: storedUser } = loadAuth();
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(storedUser);
    }
    setIsLoading(false);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data = await loginRequest(email, password);
    setToken(data.token);
    setUser(data.user);
    saveAuth(data);
    return data;
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    clearAuth();
  }, []);

  const value = useMemo(
    () => ({
      user,
      token,
      isLoading,
      login,
      logout,
    }),
    [user, token, isLoading, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
