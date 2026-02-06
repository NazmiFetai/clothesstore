// app/api/v1/products/[id]/quantity/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";

export const runtime = "nodejs";

type VariantQuantityRow = {
  variant_id: number;
  initial_quantity: number;
  sold_quantity: number;
  current_quantity: number;
  size: string | null;
  color: string | null;
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

function toVariantResource(productId: number, row: VariantQuantityRow) {
  return {
    ...row,
    _links: {
      product: { href: `/api/v1/products/${productId}` },
      stock: { href: `/api/v1/products/${productId}/stock` },
      self: { href: `/api/v1/products/${productId}/quantity` },
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
      [productId],
    );

    if (!res.rowCount) {
      return errorResponse(
        "PRODUCT_NOT_FOUND",
        "No variants found or product not found.",
        404,
      );
    }

    const rows = res.rows as VariantQuantityRow[];
    const variants = rows.map((row) => toVariantResource(productId, row));

    return NextResponse.json(
      {
        product_id: productId,
        variants,
        _links: {
          self: { href: `/api/v1/products/${productId}/quantity` },
          product: { href: `/api/v1/products/${productId}` },
          stock: { href: `/api/v1/products/${productId}/stock` },
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("GET /api/v1/products/:id/quantity failed:", err);
    return errorResponse(
      "PRODUCT_QUANTITY_FAILED",
      "Internal server error.",
      500,
    );
  }
}
