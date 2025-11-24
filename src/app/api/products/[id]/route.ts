// app/api/products/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { requireRoleFromHeader } from "../../../../lib/roles";

// -----------------------------
// GET Product (Public)
// -----------------------------
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params;
  const productId = Number(id);

  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const res = await db.query(
    `SELECT p.*, (
        SELECT json_agg(row_to_json(pv))
        FROM product_variants pv
        WHERE pv.product_id = p.id AND pv.deleted_at IS NULL
      ) AS variants
     FROM products p
     WHERE p.id = $1 AND p.deleted_at IS NULL`,
    [productId]
  );

  if (!res.rowCount) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(res.rows[0], { status: 200 });
}

// -----------------------------
// PUT Product (admin + advanced)
// -----------------------------
export async function PUT(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 403 });
  }

  const { id } = await ctx.params;
  const productId = Number(id);

  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const body = await req.json();

  const res = await db.query(
    `UPDATE products SET
       name = COALESCE($2, name),
       description = COALESCE($3, description),
       category_id = COALESCE($4, category_id),
       brand_id = COALESCE($5, brand_id),
       gender_id = COALESCE($6, gender_id),
       default_price = COALESCE($7, default_price),
       updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [
      productId,
      body.name,
      body.description,
      body.category_id,
      body.brand_id,
      body.gender_id,
      body.default_price,
    ]
  );

  if (!res.rowCount) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(res.rows[0], { status: 200 });
}

// -----------------------------
// DELETE Product (admin only, soft delete)
// -----------------------------
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 403 });
  }

  const { id } = await ctx.params;
  const productId = Number(id);

  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    // Soft delete product
    const res = await db.query(
      `UPDATE products
       SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [productId]
    );

    if (res.rowCount === 0) {
      return NextResponse.json(
        { error: "Product not found or already deleted" },
        { status: 404 }
      );
    }

    // Soft delete all its variants
    await db.query(
      `UPDATE product_variants
       SET deleted_at = NOW()
       WHERE product_id = $1 AND deleted_at IS NULL`,
      [productId]
    );

    return NextResponse.json({ message: "Product deleted" }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /products/:id failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// -----------------------------
// PATCH Product (optional restore for soft deleted)
// -----------------------------
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 403 });
  }

  const { id } = await ctx.params;
  const productId = Number(id);

  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  try {
    const res = await db.query(
      `UPDATE products
       SET deleted_at = NULL
       WHERE id = $1 AND deleted_at IS NOT NULL
       RETURNING *`,
      [productId]
    );

    if (!res.rowCount) {
      return NextResponse.json(
        { error: "Product not found or not deleted" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Product restored", product: res.rows[0] }, { status: 200 });
  } catch (err: any) {
    console.error("PATCH /products/:id failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
