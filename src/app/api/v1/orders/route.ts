// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import db from "../../../lib/db";

/* ------------------------ GET /api/orders ------------------------ */
export async function GET() {
  const res = await db.query(
    `
    SELECT
      o.*,
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
    `
  );

  return NextResponse.json(res.rows);
}

/* ------------------------ POST /api/orders ------------------------ */
// Body:
// {
//   client_id?: number,
//   created_by?: number,
//   payment_method: string,
//   status?: string,
//   client?: {
//     first_name?: string,
//     last_name?: string,
//     email?: string,
//     phone?: string,
//     address?: string,
//     city?: string,
//     postal_code?: string,
//     country?: string
//   },
//   items: [{ product_variant_id, unit_price, quantity }]
// }

export async function POST(req: Request) {
  const body = await req.json();
  const clientConn = await db.getClient();

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

    const clientData = body.client ?? null;
    let clientId = body.client_id ?? null;

    // If we have client data with an email, create or reuse clients row
    if (!clientId && clientData && clientData.email) {
      const existing = await db.query(
        "SELECT id FROM clients WHERE email = $1 LIMIT 1",
        [clientData.email]
      );

      if ((existing.rowCount ?? 0) > 0) {
        // <-- FIX HERE
        clientId = existing.rows[0].id;

        // Optional: update existing client with latest details
        await db.query(
          `UPDATE clients
       SET first_name = COALESCE($2, first_name),
           last_name = COALESCE($3, last_name),
           phone = COALESCE($4, phone),
           address = COALESCE($5, address),
           city = COALESCE($6, city),
           postal_code = COALESCE($7, postal_code),
           country = COALESCE($8, country)
       WHERE id = $1`,
          [
            clientId,
            clientData.first_name ?? null,
            clientData.last_name ?? null,
            clientData.phone ?? null,
            clientData.address ?? null,
            clientData.city ?? null,
            clientData.postal_code ?? null,
            clientData.country ?? null,
          ]
        );
      } else {
        const inserted = await db.query(
          `INSERT INTO clients
        (first_name, last_name, email, phone, address, city, postal_code, country)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id`,
          [
            clientData.first_name ?? null,
            clientData.last_name ?? null,
            clientData.email ?? null,
            clientData.phone ?? null,
            clientData.address ?? null,
            clientData.city ?? null,
            clientData.postal_code ?? null,
            clientData.country ?? null,
          ]
        );
        clientId = inserted.rows[0].id;
      }
    }

    // Validate clientId if provided but no client data to auto-create
    if (clientId != null && !clientData) {
      const c = await db.query("SELECT id FROM clients WHERE id = $1", [
        clientId,
      ]);
      if (c.rowCount === 0) {
        return NextResponse.json(
          { error: "Invalid client_id" },
          { status: 400 }
        );
      }
    }

    // Validate created_by if provided
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

    await clientConn.query("BEGIN");

    const orderRes = await clientConn.query(
      `INSERT INTO orders (client_id, created_by, status, payment_method, created_at)
       VALUES ($1,$2,$3,$4,now())
       RETURNING id`,
      [
        clientId ?? null,
        body.created_by ?? null,
        body.status ?? "pending",
        body.payment_method ?? null,
      ]
    );

    const orderId = orderRes.rows[0].id;
    let total = 0;

    for (const it of body.items) {
      const unitPrice = Number(it.unit_price);
      const qty = Number(it.quantity);

      if (!Number.isFinite(unitPrice) || !Number.isFinite(qty) || qty <= 0) {
        await clientConn.query("ROLLBACK");
        return NextResponse.json(
          { error: "Invalid item price or quantity" },
          { status: 400 }
        );
      }

      const subtotal = unitPrice * qty;
      total += subtotal;

      await clientConn.query(
        `INSERT INTO order_items (order_id, product_variant_id, unit_price, quantity, subtotal)
         VALUES ($1,$2,$3,$4,$5)`,
        [orderId, it.product_variant_id, unitPrice, qty, subtotal]
      );
    }

    await clientConn.query(
      `UPDATE orders SET total_amount = $1 WHERE id = $2`,
      [total, orderId]
    );

    await clientConn.query("COMMIT");

    const res = await db.query(
      `SELECT o.*,
        (SELECT json_agg(row_to_json(oi))
         FROM order_items oi
         WHERE oi.order_id = o.id) AS items
       FROM orders o
       WHERE o.id = $1`,
      [orderId]
    );

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err: any) {
    await clientConn.query("ROLLBACK");
    console.error("POST /api/orders error:", err);
    return NextResponse.json(
      { error: "Error creating order", details: err?.message ?? String(err) },
      { status: 500 }
    );
  } finally {
    clientConn.release();
  }
}
