import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

// GET all discounts
export async function GET() {
  const res = await db.query(
    `SELECT * FROM discounts ORDER BY created_at DESC`,
  );
  return NextResponse.json(res.rows);
}

// POST new discount
export async function POST(req: Request) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  const { name, type, value, start_date, end_date, active, product_ids } =
    await req.json();
  const client = await db.getClient();
  try {
    await client.query("BEGIN");
    const d = await client.query(
      `INSERT INTO discounts (name,type,value,start_date,end_date,active,created_at)
       VALUES ($1,$2,$3,$4,$5,$6,now()) RETURNING id`,
      [name, type, value, start_date || null, end_date || null, active ?? true],
    );
    const discountId = d.rows[0].id;
    if (Array.isArray(product_ids) && product_ids.length) {
      for (const pid of product_ids) {
        await client.query(
          `INSERT INTO discount_products (discount_id, product_id) VALUES ($1,$2) ON CONFLICT DO NOTHING`,
          [discountId, pid],
        );
      }
    }
    await client.query("COMMIT");
    return NextResponse.json({ id: discountId }, { status: 201 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    return new NextResponse(err.message || "Error creating discount", {
      status: 500,
    });
  } finally {
    client.release();
  }
}
