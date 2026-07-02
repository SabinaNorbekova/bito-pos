import { useState } from "react";
import type { ReactNode } from "react";
import type { AuthUser } from "../types";
import { setToken } from "./client";
import { AuthContext } from "./AuthContextObject";

const STORAGE_KEY = "bito_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  });

  function login(token: string, u: AuthUser) {
    setToken(token);
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(u));
    setUser(u);
  }

  function logout() {
    setToken(null);
    sessionStorage.removeItem(STORAGE_KEY);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
