import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { requireRoleFromHeader } from "../../../../lib/roles";

// GET /api/orders/[id]
export async function GET(req: Request, { params }: any) {
  const p = await params; // unwrap promise
  const id = Number(p.id);
  if (isNaN(id)) return new NextResponse("Invalid ID", { status: 400 });

  const res = await db.query(`SELECT * FROM orders WHERE id = $1`, [id]);
  if (!res.rowCount) return new NextResponse("Order not found", { status: 404 });

  // Include order items
  const itemsRes = await db.query(`SELECT * FROM order_items WHERE order_id = $1`, [id]);
  const order = { ...res.rows[0], items: itemsRes.rows };

  return NextResponse.json(order);
}

// PUT /api/orders/[id]
export async function PUT(req: Request, { params }: any) {
  const p = await params; // unwrap promise
  const id = Number(p.id);
  if (isNaN(id)) return new NextResponse("Invalid ID", { status: 400 });

  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin", "advanced_user"]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  const { status } = await req.json();

  // If confirming, lock variants and decrement stock inside a transaction
  if (status === "confirmed") {
    const client = await db.getClient();
    try {
      await client.query("BEGIN");

      const itemsRes = await client.query(`SELECT * FROM order_items WHERE order_id = $1`, [id]);
      if (!itemsRes.rowCount) throw new Error("Order has no items");

      // Check and reserve stock for each variant
      for (const it of itemsRes.rows) {
        const v = await client.query(
          `SELECT initial_quantity FROM product_variants WHERE id = $1 FOR UPDATE`,
          [it.product_variant_id]
        );
        if (!v.rowCount) throw new Error(`Variant not found: ${it.product_variant_id}`);
        const avail = Number(v.rows[0].initial_quantity);
        if (avail < it.quantity) throw new Error(`Insufficient stock for variant ${it.product_variant_id}`);
        await client.query(
          `UPDATE product_variants SET initial_quantity = initial_quantity - $1 WHERE id = $2`,
          [it.quantity, it.product_variant_id]
        );
      }

      // Update order status
      await client.query(`UPDATE orders SET status = $1, updated_at = now() WHERE id = $2`, [status, id]);
      await client.query("COMMIT");

      const updated = await db.query(`SELECT * FROM orders WHERE id = $1`, [id]);
      const updatedItems = await db.query(`SELECT * FROM order_items WHERE order_id = $1`, [id]);
      return NextResponse.json({ ...updated.rows[0], items: updatedItems.rows });
    } catch (err: any) {
      await client.query("ROLLBACK");
      return new NextResponse(err.message || "Error confirming order", { status: 400 });
    } finally {
      client.release();
    }
  }

  // Non-confirm status update (no stock mutation)
  const res = await db.query(
    `UPDATE orders SET status = $2, updated_at = now() WHERE id = $1 RETURNING *`,
    [id, status]
  );
  if (!res.rowCount) return new NextResponse("Order not found", { status: 404 });

  const updatedItems = await db.query(`SELECT * FROM order_items WHERE order_id = $1`, [id]);
  return NextResponse.json({ ...res.rows[0], items: updatedItems.rows });
}

// DELETE /api/orders/[id]
export async function DELETE(req: Request, { params }: any) {
  const p = await params; // unwrap promise
  const id = Number(p.id);
  if (isNaN(id)) return new NextResponse("Invalid ID", { status: 400 });

  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return new NextResponse(e.message, { status: e.status || 403 });
  }

  await db.query(`DELETE FROM orders WHERE id = $1`, [id]);
  return new NextResponse(null, { status: 204 });
}
