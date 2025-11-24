// ...existing code...
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import db from "../../../../lib/db";
import { signToken } from "../../../../lib/auth";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body || !body.username || !body.password) {
      return NextResponse.json({ error: "username and password are required" }, { status: 400 });
    }
    const { username, password } = body;

    const result = await db.query(
      `SELECT u.id, u.username, u.password_hash, u.role_id, r.name AS role_name
       FROM users u LEFT JOIN roles r ON u.role_id = r.id
       WHERE u.username = $1 LIMIT 1`,
      [username]
    );

    if (result.rowCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    
    // ...existing code...
    const user = result.rows[0];
    console.log('DEBUG: user.password_hash:', user.password_hash); // remove after debug
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    console.log('DEBUG: passwordMatch=', passwordMatch);
    if (!passwordMatch) return NextResponse.json({ error: "Incorrect password" }, { status: 401 });
    // ...existing code...

    const payload = { id: user.id, username: user.username, role_id: user.role_id, role_name: user.role_name };
    const token = signToken(payload);

    return NextResponse.json({
      token,
      user: { id: user.id, username: user.username, role_id: user.role_id, role_name: user.role_name }
    });
  } catch (err: any) {
    // log full error to server terminal for debugging
    console.error("Login error:", err && err.stack ? err.stack : err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
// ...existing code...