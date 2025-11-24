import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import db from "../../../../lib/db";
import { signToken } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { username, password, email, role_id } = body ?? {};

    if (!username || !password) {
      return NextResponse.json({ error: "username and password are required" }, { status: 400 });
    }

    const hashed = await bcrypt.hash(password, 10);

    const res = await db.query(
      `INSERT INTO users (username, email, password_hash, role_id, created_at)
       VALUES ($1,$2,$3,$4,now()) RETURNING id, username, email, role_id`,
      [username, email || null, hashed, role_id || null]
    );

    const user = res.rows[0];
    // optionally issue token on register
    const token = signToken({ id: user.id, username: user.username, role_id: user.role_id });

    return NextResponse.json({ token, user }, { status: 201 });
  } catch (err: any) {
    // handle unique violation or other DB errors
    const msg = err?.code === "23505" ? "User already exists" : err.message ?? "Server error";
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}