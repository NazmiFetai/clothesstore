// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import db from "../../../lib/db";

// GET /api/orders
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    const page = Number(url.searchParams.get("page") || "1");
    const safeLimit = Number.isNaN(limit) || limit <= 0 ? 50 : limit;
    const safePage = Number.isNaN(page) || page <= 0 ? 1 : page;
    const offset = (safePage - 1) * safeLimit;

    const res = await db.query(
      `SELECT 
         o.*,
         -- full name + email from clients
         c.first_name,
         c.last_name,
         c.email AS client_email,
         (
           SELECT json_agg(row_to_json(oi))
           FROM order_items oi
           WHERE oi.order_id = o.id
         ) AS items
       FROM orders o
       LEFT JOIN clients c ON c.id = o.client_id
       ORDER BY o.created_at DESC
       LIMIT $1 OFFSET $2`,
      [safeLimit, offset]
    );

    return NextResponse.json(res.rows, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/orders error:", err);
    return NextResponse.json(
      { error: "Failed to fetch orders" },
      { status: 500 }
    );
  }
}

// POST /api/orders
export async function POST(req: Request) {
  const body = await req.json(); // { client_id, created_by, payment_method, items: [...] }
  const client = await db.getClient();

  try {
    if (
      !body.payment_method ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return NextResponse.json(
        { error: "payment_method and at least one item are required" },
        { status: 400 }
      );
    }

    // Validate client_id (if provided)
    if (body.client_id != null) {
      const c = await db.query("SELECT id FROM clients WHERE id = $1", [
        body.client_id,
      ]);
      if (c.rowCount === 0) {
        return NextResponse.json(
          { error: "Invalid client_id" },
          { status: 400 }
        );
      }
    }

    // Validate created_by (if provided)
    if (body.created_by != null) {
      const u = await db.query("SELECT id FROM users WHERE id = $1", [
        body.created_by,
      ]);
      if (u.rowCount === 0) {
        return NextResponse.json(
          { error: "Invalid created_by" },
          { status: 400 }
        );
      }
    }

    await client.query("BEGIN");

    const orderRes = await client.query(
      `INSERT INTO orders (client_id, created_by, status, payment_method, created_at)
       VALUES ($1,$2,$3,$4,now()) RETURNING id`,
      [
        body.client_id ?? null,
        body.created_by ?? null,
        body.status ?? "pending",
        body.payment_method ?? null,
      ]
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

    await client.query(`UPDATE orders SET total_amount = $1 WHERE id = $2`, [
      total,
      orderId,
    ]);

    await client.query("COMMIT");

    const res = await db.query(`SELECT * FROM orders WHERE id = $1`, [orderId]);
    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("POST /api/orders error:", err);
    return NextResponse.json(
      { error: "Error creating order", details: err?.message ?? String(err) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
