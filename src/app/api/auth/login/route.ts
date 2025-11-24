import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import db from "../../../../lib/db";
import { signToken } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const { email, password } = body ?? {};

    // validate body
    if (!email || !password) {
      return NextResponse.json(
        { error: "email and password are required" },
        { status: 400 }
      );
    }

    const result = await db.query(
      `
      SELECT 
        u.id,
        u.username AS name,
        u.email,
        u.password_hash,
        r.name AS role
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.email = $1
      LIMIT 1
      `,
      [email]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }

    // token contains the minimal stuff you actually need on the backend
    const token = signToken({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    // response matches what we use on the frontend: id, name, email, role
    return NextResponse.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err: any) {
    console.error("Login error:", err?.stack ?? err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
