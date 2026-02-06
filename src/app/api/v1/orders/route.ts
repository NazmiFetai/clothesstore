// src/app/api/v1/orders/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

type OrderRow = {
  id: number;
  client_id: number | null;
  created_by: number | null;
  status: string;
  payment_method: string | null;
  total_amount: string | number;
  created_at: string;
  updated_at: string;
};

function errorResponse(code: string, message: string, status: number) {
  return NextResponse.json(
    {
      error: {
        code,
        message,
      },
    },
    { status },
  );
}

function toOrderResource(order: any) {
  const isConfirmed = order.status === "confirmed";

  return {
    ...order,
    _links: {
      self: { href: `/api/v1/orders/${order.id}` },
      confirm: !isConfirmed
        ? {
            href: `/api/v1/orders/${order.id}`,
            method: "PUT",
            body: { status: "confirmed" },
          }
        : null,
      delete: { href: `/api/v1/orders/${order.id}`, method: "DELETE" },
      collection: { href: `/api/v1/orders` },
    },
  };
}

/* -------------------------------------------------------
   GET — List orders (admin, advanced_user)
   GET /api/v1/orders
------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);
  } catch (err: any) {
    return errorResponse(
      "UNAUTHORIZED",
      err?.message || "Unauthorized",
      err?.status || 401,
    );
  }

  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    const offset = Number(url.searchParams.get("offset") || "0");

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
      LIMIT $1 OFFSET $2
      `,
      [limit, offset],
    );

    const resources = res.rows.map(toOrderResource);

    const basePath = "/api/v1/orders";

    return NextResponse.json(
      {
        data: resources,
        pagination: {
          limit,
          offset,
          count: resources.length,
        },
        _links: {
          self: { href: `${basePath}?limit=${limit}&offset=${offset}` },
          next: { href: `${basePath}?limit=${limit}&offset=${offset + limit}` },
          prev:
            offset > 0
              ? {
                  href: `${basePath}?limit=${limit}&offset=${Math.max(
                    0,
                    offset - limit,
                  )}`,
                }
              : null,
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("GET /api/v1/orders error:", err);
    return errorResponse(
      "ORDER_LIST_FAILED",
      err?.message || "Failed to fetch orders.",
      500,
    );
  }
}

/* -------------------------------------------------------
   POST — Create order (public / customer checkout)
   POST /api/v1/orders
------------------------------------------------------- */
export async function POST(req: Request) {
  const clientConn = await db.getClient();

  try {
    const body = await req.json();

    if (
      !body.payment_method ||
      !Array.isArray(body.items) ||
      body.items.length === 0
    ) {
      return errorResponse(
        "VALIDATION_ERROR",
        "payment_method and at least one item are required.",
        400,
      );
    }

    const clientData = body.client ?? null;
    let clientId = body.client_id ?? null;

    // create/reuse client if email is provided
    if (!clientId && clientData && clientData.email) {
      const existing = await db.query(
        "SELECT id FROM clients WHERE email = $1 LIMIT 1",
        [clientData.email],
      );

      if ((existing.rowCount ?? 0) > 0) {
        clientId = existing.rows[0].id;

        await db.query(
          `
          UPDATE clients
          SET first_name = COALESCE($2, first_name),
              last_name  = COALESCE($3, last_name),
              phone      = COALESCE($4, phone),
              address    = COALESCE($5, address),
              city       = COALESCE($6, city),
              postal_code= COALESCE($7, postal_code),
              country    = COALESCE($8, country)
          WHERE id = $1
        `,
          [
            clientId,
            clientData.first_name ?? null,
            clientData.last_name ?? null,
            clientData.phone ?? null,
            clientData.address ?? null,
            clientData.city ?? null,
            clientData.postal_code ?? null,
            clientData.country ?? null,
          ],
        );
      } else {
        const inserted = await db.query(
          `
          INSERT INTO clients
            (first_name, last_name, email, phone, address, city, postal_code, country)
          VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
          RETURNING id
        `,
          [
            clientData.first_name ?? null,
            clientData.last_name ?? null,
            clientData.email ?? null,
            clientData.phone ?? null,
            clientData.address ?? null,
            clientData.city ?? null,
            clientData.postal_code ?? null,
            clientData.country ?? null,
          ],
        );
        clientId = inserted.rows[0].id;
      }
    }

    // validate client_id if given directly
    if (clientId != null && !clientData) {
      const c = await db.query("SELECT id FROM clients WHERE id = $1", [
        clientId,
      ]);
      if (c.rowCount === 0) {
        return errorResponse("INVALID_CLIENT", "Invalid client_id.", 400);
      }
    }

    // validate created_by if provided
    if (body.created_by != null) {
      const u = await db.query("SELECT id FROM users WHERE id = $1", [
        body.created_by,
      ]);
      if (u.rowCount === 0) {
        return errorResponse("INVALID_USER", "Invalid created_by.", 400);
      }
    }

    await clientConn.query("BEGIN");

    const orderRes = await clientConn.query(
      `
      INSERT INTO orders (client_id, created_by, status, payment_method, created_at)
      VALUES ($1,$2,$3,$4,now())
      RETURNING id
      `,
      [
        clientId ?? null,
        body.created_by ?? null,
        body.status ?? "pending",
        body.payment_method ?? null,
      ],
    );

    const orderId = orderRes.rows[0].id;
    let total = 0;

    for (const it of body.items) {
      const unitPrice = Number(it.unit_price);
      const qty = Number(it.quantity);

      if (!Number.isFinite(unitPrice) || !Number.isFinite(qty) || qty <= 0) {
        await clientConn.query("ROLLBACK");
        return errorResponse(
          "INVALID_ITEM",
          "Invalid item price or quantity.",
          400,
        );
      }

      const subtotal = unitPrice * qty;
      total += subtotal;

      await clientConn.query(
        `
        INSERT INTO order_items
          (order_id, product_variant_id, unit_price, quantity, subtotal)
        VALUES ($1,$2,$3,$4,$5)
        `,
        [orderId, it.product_variant_id, unitPrice, qty, subtotal],
      );
    }

    await clientConn.query(
      `UPDATE orders SET total_amount = $1 WHERE id = $2`,
      [total, orderId],
    );

    await clientConn.query("COMMIT");

    const res = await db.query(
      `
      SELECT o.*,
        (SELECT json_agg(row_to_json(oi))
         FROM order_items oi
         WHERE oi.order_id = o.id) AS items
      FROM orders o
      WHERE o.id = $1
      `,
      [orderId],
    );

    const resource = toOrderResource(res.rows[0] as OrderRow);

    const response = NextResponse.json(resource, { status: 201 });
    response.headers.set("Location", `/api/v1/orders/${orderId}`);
    return response;
  } catch (err: any) {
    await clientConn.query("ROLLBACK");
    console.error("POST /api/v1/orders error:", err);
    return errorResponse(
      "ORDER_CREATE_FAILED",
      err?.message || "Error creating order.",
      500,
    );
  } finally {
    clientConn.release();
  }
}
