import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

export async function GET(req: Request) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  const res = await db.query(
    `SELECT id, username, email, role_id, created_at FROM users ORDER BY id`,
  );
  return NextResponse.json(res.rows);
}

export async function POST(req: Request) {
  // try {
  //   await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  // } catch (e: any) {
  //   return new NextResponse(e.message, { status: e.status || 403 });
  // }

  try {
    const { username, password, role_id, email } = await req.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: "username and password are required" },
        { status: 400 },
      );
    }

    const hashed = await bcrypt.hash(password, 10);
    const res = await db.query(
      `INSERT INTO users (username, email, password_hash, role_id, created_at)
       VALUES ($1,$2,$3,$4,now()) RETURNING id, username, email, role_id`,
      [username, email || null, hashed, role_id || null],
    );

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
