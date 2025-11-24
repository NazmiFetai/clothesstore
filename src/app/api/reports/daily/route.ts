// ...existing code...
import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { requireRoleFromHeader } from "../../../../lib/roles";

export async function GET(req: Request) {
  try { await requireRoleFromHeader(req.headers.get("authorization"), ["admin", "advanced_user"]); } catch (e: any) { return new NextResponse(e.message, { status: e.status || 403 }); }
  const res = await db.query(`SELECT * FROM vw_daily_earnings ORDER BY day DESC LIMIT 30`);
  return NextResponse.json(res.rows);
}
// ...existing code...