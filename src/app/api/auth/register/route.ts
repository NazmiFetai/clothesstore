// src/app/api/auth/register/route.ts

import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import db from "../../../../lib/db";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, username, email, password } = body ?? {};

    if ((!name && !username) || !email || !password) {
      return NextResponse.json(
        { error: "name (or username), email and password are required" },
        { status: 400 }
      );
    }

    const hashed = await bcrypt.hash(password, 10);

    // Default role = simple_user (normal customer)
    const roleRes = await db.query(
      "SELECT id FROM roles WHERE name = $1 LIMIT 1",
      ["simple_user"]
    );
    const defaultRoleId = roleRes.rows[0]?.id ?? null;

    const finalUsername = username || name;

    const res = await db.query(
      `INSERT INTO users (username, email, password_hash, role_id, created_at)
       VALUES ($1,$2,$3,$4,now())
       RETURNING id, username, email, role_id`,
      [finalUsername, email, hashed, defaultRoleId]
    );

    const user = res.rows[0];

    // We don't need to log in immediately – frontend redirects to /login
    return NextResponse.json(
      {
        id: user.id,
        name: user.username,
        email: user.email,
        role: "simple_user",
      },
      { status: 201 }
    );
  } catch (err: any) {
    const msg =
      err?.code === "23505"
        ? "User with this email or username already exists"
        : err.message ?? "Server error";

    return NextResponse.json({ error: msg }, { status: 400 });
  }
}
