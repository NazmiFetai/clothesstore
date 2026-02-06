// app/api/v1/products/[id]/stock/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";

type StockRow = {
  product_id: number;
  name: string;
  initial_quantity: number;
  sold_quantity: number;
  current_quantity: number;
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

function toStockResource(row: StockRow) {
  return {
    ...row,
    _links: {
      self: { href: `/api/v1/products/${row.product_id}/stock` },
      product: { href: `/api/v1/products/${row.product_id}` },
      quantity: { href: `/api/v1/products/${row.product_id}/quantity` },
    },
  };
}

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const productId = Number(id);

  if (isNaN(productId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid product id.", 400);
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
      [productId],
    );

    if (!res.rowCount) {
      return errorResponse("PRODUCT_NOT_FOUND", "Product not found.", 404);
    }

    const row = res.rows[0] as StockRow;
    const resource = toStockResource(row);

    return NextResponse.json(resource, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/v1/products/:id/stock failed:", err);
    return errorResponse("PRODUCT_STOCK_FAILED", "Internal server error.", 500);
  }
}
