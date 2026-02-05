// app/api/products/[id]/quantity/route.ts
import { NextResponse } from "next/server";
import db from "../../../../../lib/db";

export const runtime = "nodejs";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  // Unwrap the Promise
  const { id } = await ctx.params;
  const productId = Number(id);

  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const res = await db.query(
      `
      SELECT 
        pv.id AS variant_id,
        pv.initial_quantity,
        COALESCE(SUM(oi.quantity), 0) AS sold_quantity,
        (pv.initial_quantity - COALESCE(SUM(oi.quantity), 0)) AS current_quantity,
        s.name AS size,
        c.name AS color
      FROM product_variants pv
      LEFT JOIN order_items oi
        ON oi.product_variant_id = pv.id
      LEFT JOIN sizes s
        ON s.id = pv.size_id
      LEFT JOIN colors c
        ON c.id = pv.color_id
      WHERE pv.product_id = $1 AND pv.deleted_at IS NULL
      GROUP BY pv.id, pv.initial_quantity, s.name, c.name
      ORDER BY pv.id
      `,
      [productId]
    );

    if (!res.rowCount) {
      return NextResponse.json(
        { error: "No variants found or product not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        product_id: productId,
        variants: res.rows,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("GET /products/:id/quantity failed:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
