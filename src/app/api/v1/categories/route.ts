import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

// GET /api/categories
export async function GET() {
  const res = await db.query(`SELECT * FROM categories ORDER BY name`);
  return NextResponse.json(res.rows);
}

// POST /api/categories
export async function POST(req: Request) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  const { name, description } = await req.json();

  try {
    // Try to insert, but skip if name already exists
    const res = await db.query(
      `INSERT INTO categories (name, description)
       VALUES ($1, $2)
       ON CONFLICT (name) DO NOTHING
       RETURNING *`,
      [name, description || null],
    );

    if (res.rowCount === 0) {
      // Category already exists
      return NextResponse.json(
        { error: `Category "${name}" already exists` },
        { status: 400 },
      );
    }

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err: any) {
    console.error("POST /categories failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
