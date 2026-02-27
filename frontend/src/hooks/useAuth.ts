// src/hooks/useAuth.ts
import { useState, useEffect, useCallback } from "react";
import api from "../lib/axios";

export interface AuthUser {
  username: string;
  email: string;
  role: "admin" | "user";
}

export const useAuth = () => {
  // Rehydrate from localStorage so the user doesn't need to log in on every refresh
  const [user, setUserState] = useState<AuthUser | null>(() => {
    try {
      const stored = localStorage.getItem("auth_user");
      return stored ? (JSON.parse(stored) as AuthUser) : null;
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState(true);

  // On mount, verify the stored token is still valid with /me
  useEffect(() => {
    const access = localStorage.getItem("access_token");
    if (!access) {
      setLoading(false);
      return;
    }

    api
      .get("/api/auth/me/")
      .then(({ data }) => {
        if (data.authenticated) {
          const u: AuthUser = {
            username: data.username,
            email: data.email,
            role: data.role,
          };
          setUserState(u);
          localStorage.setItem("auth_user", JSON.stringify(u));
        } else {
          clearLocal();
        }
      })
      .catch(() => {
        // The interceptor handles token refresh; if we still land here the
        // session is truly expired
        clearLocal();
      })
      .finally(() => setLoading(false));
  }, []);

  function clearLocal() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("auth_user");
    setUserState(null);
  }

  const setUser = useCallback((u: AuthUser | null) => {
    if (u) {
      localStorage.setItem("auth_user", JSON.stringify(u));
    } else {
      localStorage.removeItem("auth_user");
    }
    setUserState(u);
  }, []);

  const logout = useCallback(async () => {
    const refresh = localStorage.getItem("refresh_token");
    try {
      // Tell the backend to blacklist the refresh token
      await api.post("/api/auth/logout/", { refresh });
    } catch {
      // Ignore — still clear locally
    } finally {
      clearLocal();
    }
  }, []);

  return { user, setUser, loading, logout };
};