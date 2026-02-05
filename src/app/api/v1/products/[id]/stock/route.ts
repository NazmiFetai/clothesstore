import { NextResponse } from "next/server";
import db from "../../../../../lib/db";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  // Unwrap the Promise to get params
  const { id } = await ctx.params;
  const productId = Number(id);

  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const res = await db.query(
      `
      SELECT p.id AS product_id, p.name,
        COALESCE(SUM(pv.initial_quantity),0) AS initial_quantity,
        COALESCE(SUM(sold.qty),0) AS sold_quantity,
        (COALESCE(SUM(pv.initial_quantity),0) - COALESCE(SUM(sold.qty),0)) AS current_quantity
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN (
        SELECT product_variant_id, SUM(quantity) AS qty
        FROM order_items oi
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status NOT IN ('cancelled')
        GROUP BY product_variant_id
      ) sold ON sold.product_variant_id = pv.id
      WHERE p.id = $1
      GROUP BY p.id, p.name
      `,
      [productId] // pass the actual number, not NaN
    );

    if (!res.rowCount)
      return NextResponse.json({ error: "Product not found" }, { status: 404 });

    return NextResponse.json(res.rows[0], { status: 200 });
  } catch (err: any) {
    console.error("GET /products/:id/stock failed:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
