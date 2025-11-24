// ...existing code...
import db from "./db";
import { verifyToken } from "./auth";

export type UserPayload = { id: number; username: string; role_id?: number; role_name?: string };

export function decodeAuthHeader(authHeader?: string): UserPayload | null {
  if (!authHeader) return null;
  const token = authHeader.split(" ")[1] ?? authHeader;
  try {
    return verifyToken(token) as UserPayload;
  } catch {
    return null;
  }
}

export async function requireRoleFromHeader(authHeader: string | null, allowedRoles: string[]) {
  const payload = decodeAuthHeader(authHeader ?? undefined);
  if (!payload) throw Object.assign(new Error("Unauthorized"), { status: 401 });
  if (!payload.role_name && payload.role_id) {
    const r = await db.query("SELECT name FROM roles WHERE id = $1 LIMIT 1", [payload.role_id]);
    payload.role_name = r.rows[0]?.name;
  }
  if (!payload.role_name || !allowedRoles.includes(payload.role_name)) {
    throw Object.assign(new Error("Forbidden"), { status: 403 });
  }
  return payload;
}
// ...existing code...