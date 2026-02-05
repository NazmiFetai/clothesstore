import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { requireRoleFromHeader } from "../../../../lib/roles";

export async function PUT(req: Request, context: { params: { id: string } | Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = params instanceof Promise ? await params : params;
  const id = Number(resolvedParams.id);

  if (isNaN(id)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });

  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin", "advanced_user"]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  const { name, description } = await req.json();
  const res = await db.query(
    `UPDATE categories 
     SET name = COALESCE($2, name), description = COALESCE($3, description) 
     WHERE id = $1 
     RETURNING *`,
    [id, name, description]
  );

  if (!res.rowCount) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  return NextResponse.json(res.rows[0]);
}

export async function DELETE(req: Request, context: { params: { id: string } | Promise<{ id: string }> }) {
  const { params } = context;
  const resolvedParams = params instanceof Promise ? await params : params;
  const id = Number(resolvedParams.id);

  if (isNaN(id)) return NextResponse.json({ error: "Invalid category ID" }, { status: 400 });

  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  const res = await db.query(`DELETE FROM categories WHERE id = $1 RETURNING *`, [id]);
  if (!res.rowCount) return NextResponse.json({ error: "Category not found" }, { status: 404 });

  return NextResponse.json(res.rows[0]);
}
