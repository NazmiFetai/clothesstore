// src/lib/auth-storage.ts

"use client";

import type { LoginResponse, User } from "./types";

const TOKEN_KEY = "auth_token";
const USER_KEY = "auth_user";

export function saveAuth(data: LoginResponse) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_KEY, data.token);
  localStorage.setItem(USER_KEY, JSON.stringify(data.user));
}

export function loadAuth(): { token: string | null; user: User | null } {
  if (typeof window === "undefined") {
    return { token: null, user: null };
  }

  const token = localStorage.getItem(TOKEN_KEY);
  const rawUser = localStorage.getItem(USER_KEY);

  let user: User | null = null;
  if (rawUser) {
    try {
      user = JSON.parse(rawUser) as User;
    } catch {
      user = null;
    }
  }

  return { token, user };
}

export function clearAuth() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}
