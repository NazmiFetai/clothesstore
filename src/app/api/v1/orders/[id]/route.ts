// src/app/api/v1/orders/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

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

// -----------------------------
// GET /api/v1/orders/[id]
// -----------------------------
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
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

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (Number.isNaN(orderId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid order id.", 400);
  }

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

  if (!res.rowCount) {
    return errorResponse("ORDER_NOT_FOUND", "Order not found.", 404);
  }

  const resource = toOrderResource(res.rows[0]);
  return NextResponse.json(resource, { status: 200 });
}

// -----------------------------
// PUT /api/v1/orders/[id]  (status update / confirm)
// -----------------------------
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
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

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (Number.isNaN(orderId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid order id.", 400);
  }

  const { status } = await req.json();

  if (!status) {
    return errorResponse("VALIDATION_ERROR", "status is required.", 400);
  }

  // confirm path (stock reservation)
  if (status === "confirmed") {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const itemsRes = await client.query(
        `SELECT * FROM order_items WHERE order_id = $1`,
        [orderId],
      );
      if (!itemsRes.rowCount) {
        throw new Error("Order has no items");
      }

      for (const it of itemsRes.rows) {
        const v = await client.query(
          `SELECT initial_quantity FROM product_variants WHERE id = $1 FOR UPDATE`,
          [it.product_variant_id],
        );
        if (!v.rowCount) {
          throw new Error(`Variant not found: ${it.product_variant_id}`);
        }
        const avail = Number(v.rows[0].initial_quantity);
        if (avail < it.quantity) {
          throw new Error(
            `Insufficient stock for variant ${it.product_variant_id}`,
          );
        }
        await client.query(
          `UPDATE product_variants
           SET initial_quantity = initial_quantity - $1
           WHERE id = $2`,
          [it.quantity, it.product_variant_id],
        );
      }

      await client.query(
        `UPDATE orders
         SET status = $1, updated_at = now()
         WHERE id = $2`,
        [status, orderId],
      );

      await client.query("COMMIT");
    } catch (err: any) {
      await client.query("ROLLBACK");
      return errorResponse(
        "ORDER_CONFIRM_FAILED",
        err?.message || "Error confirming order.",
        400,
      );
    } finally {
      client.release();
    }
  } else {
    // simple status change
    const res = await db.query(
      `UPDATE orders
       SET status = $2, updated_at = now()
       WHERE id = $1
       RETURNING *`,
      [orderId, status],
    );
    if (!res.rowCount) {
      return errorResponse("ORDER_NOT_FOUND", "Order not found.", 404);
    }
  }

  const updated = await db.query(
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

  const resource = toOrderResource(updated.rows[0]);
  return NextResponse.json(resource, { status: 200 });
}

// -----------------------------
// DELETE /api/v1/orders/[id]
// -----------------------------
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (err: any) {
    return errorResponse(
      "UNAUTHORIZED",
      err?.message || "Unauthorized",
      err?.status || 401,
    );
  }

  const { id } = await ctx.params;
  const orderId = Number(id);
  if (Number.isNaN(orderId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid order id.", 400);
  }

  const res = await db.query(`DELETE FROM orders WHERE id = $1 RETURNING id`, [
    orderId,
  ]);

  if (!res.rowCount) {
    return errorResponse("ORDER_NOT_FOUND", "Order not found.", 404);
  }

  return NextResponse.json(
    {
      message: "Order deleted.",
      _links: {
        collection: { href: `/api/v1/orders` },
      },
    },
    { status: 200 },
  );
}
