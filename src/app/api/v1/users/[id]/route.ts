import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

interface Params {
  id: string;
}

// -------------------- GET --------------------
export async function GET(req: Request, context: { params: Promise<Params> }) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  const { id } = await context.params;
  const numericId = Number(id);

  if (!numericId) return new NextResponse("Invalid ID", { status: 400 });

  const res = await db.query(
    `SELECT id, username, email, role_id, created_at 
     FROM users 
     WHERE id = $1 LIMIT 1`,
    [numericId],
  );

  if (!res.rowCount) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json(res.rows[0]);
}

// -------------------- PUT --------------------
export async function PUT(req: Request, context: { params: Promise<Params> }) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  const { id } = await context.params;
  const numericId = Number(id);

  if (!numericId) return new NextResponse("Invalid ID", { status: 400 });

  const body = await req.json();

  try {
    let hashed: string | null = null;

    if (body.password) {
      hashed = await bcrypt.hash(body.password, 10);
    }

    const res = await db.query(
      `UPDATE users SET
         username = COALESCE($2, username),
         email = COALESCE($3, email),
         password_hash = COALESCE($4, password_hash),
         role_id = COALESCE($5, role_id)
       WHERE id = $1
       RETURNING id, username, email, role_id`,
      [
        numericId,
        body.username || null,
        body.email || null,
        hashed,
        body.role_id || null,
      ],
    );

    if (!res.rowCount) return new NextResponse("Not found", { status: 404 });

    return NextResponse.json(res.rows[0]);
  } catch (err: any) {
    console.error("PUT /api/users/:id ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// -------------------- DELETE --------------------
export async function DELETE(
  req: Request,
  context: { params: Promise<Params> },
) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  const { id } = await context.params;
  const numericId = Number(id);

  if (!numericId) return new NextResponse("Invalid ID", { status: 400 });

  const res = await db.query(`DELETE FROM users WHERE id = $1`, [numericId]);

  if (res.rowCount === 0) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(null, { status: 204 });
}
