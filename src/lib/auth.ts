// src/lib/auth.ts

import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "supersecret";

export interface JwtUserPayload {
  id: number | string;
  email?: string;
  username?: string;
  role?: string;
  role_id?: number;
  role_name?: string;
}

export function signToken(user: JwtUserPayload) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      // normalize: some code might use role, some might use role_name
      role: user.role ?? user.role_name,
      role_id: user.role_id,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token: string) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}
