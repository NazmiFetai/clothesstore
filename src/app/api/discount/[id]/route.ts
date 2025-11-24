import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { requireRoleFromHeader } from "../../../../lib/roles";

// GET /api/discount/[id]
export async function GET(req: Request, context: any) {
  const params = await context.params; // <-- await the params
  const id = Number(params.id);
  if (isNaN(id)) return new NextResponse("Invalid ID", { status: 400 });

  const res = await db.query(`SELECT * FROM discounts WHERE id = $1`, [id]);
  if (!res.rowCount) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json(res.rows[0]);
}

// PUT /api/discount/[id]
export async function PUT(req: Request, context: any) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  const params = await context.params; // <-- await the params
  const id = Number(params.id);
  if (isNaN(id)) return new NextResponse("Invalid ID", { status: 400 });

  const body = await req.json();

  const res = await db.query(
    `UPDATE discounts SET
       name = COALESCE($2,name),
       type = COALESCE($3,type),
       value = COALESCE($4,value),
       start_date = COALESCE($5,start_date),
       end_date = COALESCE($6,end_date),
       active = COALESCE($7,active)
     WHERE id = $1
     RETURNING *`,
    [id, body.name, body.type, body.value, body.start_date, body.end_date, body.active]
  );

  if (!res.rowCount) return new NextResponse("Not found", { status: 404 });

  return NextResponse.json(res.rows[0]);
}

// DELETE /api/discount/[id]
export async function DELETE(req: Request, context: any) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  const params = await context.params; // <-- await the params
  const id = Number(params.id);
  if (isNaN(id)) return new NextResponse("Invalid ID", { status: 400 });

  await db.query(`DELETE FROM discounts WHERE id = $1`, [id]);
  return new NextResponse(null, { status: 204 });
}
