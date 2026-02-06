// ...existing code...
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

export async function GET(req: Request) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }
  const res = await db.query(`SELECT * FROM vw_top_selling_products LIMIT 100`);
  return NextResponse.json(res.rows);
}
// ...existing code...
