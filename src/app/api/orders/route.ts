import { NextResponse } from "next/server";
import db from "../../../lib/db";

// GET /api/orders
export async function GET() {
  const res = await db.query(
    `SELECT o.*, 
      (SELECT json_agg(row_to_json(oi)) 
       FROM order_items oi WHERE oi.order_id = o.id) AS items
     FROM orders o
     ORDER BY o.created_at DESC`
  );
  return NextResponse.json(res.rows);
}

// POST /api/orders
export async function POST(req: Request) {
  const body = await req.json(); // { client_id, created_by, payment_method, items: [{ product_variant_id, unit_price, quantity }] }
  const client = await db.getClient();

  try {
    await client.query("BEGIN");
    const orderRes = await client.query(
      `INSERT INTO orders (client_id, created_by, status, payment_method, created_at)
       VALUES ($1,$2,$3,$4,now()) RETURNING id`,
      [body.client_id || null, body.created_by || null, body.status || "pending", body.payment_method || null]
    );

    const orderId = orderRes.rows[0].id;
    let total = 0;

    for (const it of body.items) {
      const subtotal = Number(it.unit_price) * Number(it.quantity);
      total += subtotal;
      await client.query(
        `INSERT INTO order_items (order_id, product_variant_id, unit_price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [orderId, it.product_variant_id, it.unit_price, it.quantity, subtotal]
      );
    }

    await client.query(`UPDATE orders SET total_amount = $1 WHERE id = $2`, [total, orderId]);
    await client.query("COMMIT");

    const res = await db.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
    return NextResponse.json(res.rows[0], { status: 201 });

  } catch (err) {
    await client.query("ROLLBACK");
    return new NextResponse("Error creating order", { status: 500 });
  } finally {
    client.release();
  }
}
