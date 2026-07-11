"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import api from "@/lib/api";

export type AuthUser = {
  id: number;
  email: string;
  username: string;
  nickname: string;
  role: string;
  emailVerifiedAt: string | null;
  createdAt: string;
};

export const isAdminRole = (role?: string | null) =>
  role === "ADMIN";

export const isSuperAdminRole = (role?: string | null) =>
  role === "SUPER_ADMIN";

type AuthSessionContextValue = {
  user: AuthUser | null;
  isLoading: boolean;
  refreshUser: () => Promise<AuthUser | null>;
  logout: () => Promise<void>;
};

const AuthSessionContext = createContext<AuthSessionContextValue | null>(null);

const fetchCurrentUser = async () => {
  try {
    const response = await api.get<AuthUser | null>("/auth/me");
    return response.data && typeof response.data === "object" ? response.data : null;
  } catch {
    return null;
  }
};

export function AuthSessionProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    setIsLoading(true);
    const nextUser = await fetchCurrentUser();
    setUser(nextUser);
    setIsLoading(false);
    return nextUser;
  }, []);

  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await api.post("/auth/logout");
    } finally {
      setUser(null);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshUser();
  }, [refreshUser]);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      refreshUser,
      logout,
    }),
    [user, isLoading, refreshUser, logout],
  );

  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);

  if (!context) {
    throw new Error("AuthSessionProvider 안에서만 useAuthSession을 사용할 수 있습니다.");
  }

  return context;
}
