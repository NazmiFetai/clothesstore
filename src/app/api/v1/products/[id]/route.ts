// app/api/products/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

// -----------------------------
// GET Product (Public)
// -----------------------------
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const productId = Number(id);

  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const res = await db.query(
    `
    SELECT
      p.*,
      (
        SELECT json_agg(
                 json_build_object(
                   'id', pv.id,
                   'product_id', pv.product_id,
                   'sku', pv.sku,
                   'price', pv.price,
                   'initial_quantity', pv.initial_quantity,
                   'current_quantity', pv.initial_quantity - COALESCE(sold.qty, 0),
                   'size_id', pv.size_id,
                   'color_id', pv.color_id,
                   'size_name', s.name,
                   'color_name', col.name
                 )
               )
        FROM product_variants pv
        LEFT JOIN sizes s ON s.id = pv.size_id
        LEFT JOIN colors col ON col.id = pv.color_id
        LEFT JOIN (
          SELECT product_variant_id, SUM(quantity) AS qty
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.status NOT IN ('cancelled')
          GROUP BY product_variant_id
        ) sold ON sold.product_variant_id = pv.id
        WHERE pv.product_id = p.id
          AND pv.deleted_at IS NULL
      ) AS variants
    FROM products p
    WHERE p.id = $1
      AND p.deleted_at IS NULL
    `,
    [productId],
  );

  if (!res.rowCount) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json(res.rows[0], { status: 200 });
}

// -----------------------------
// PUT Product (admin + advanced)
// Updates product and its variants
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
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 403 });
  }

  const { id } = await ctx.params;
  const productId = Number(id);

  if (isNaN(productId)) {
    return NextResponse.json({ error: "Invalid product id" }, { status: 400 });
  }

  const body = await req.json();

  const client = await db.getClient();

  try {
    await client.query("BEGIN");

    // 1) Update base product
    const prodRes = await client.query(
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
      ],
    );

    if (!prodRes.rowCount) {
      await client.query("ROLLBACK");
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const productRow = prodRes.rows[0];

    // 2) Handle variants if provided
    const variants = Array.isArray(body.variants) ? body.variants : [];

    for (const variant of variants) {
      const variantId =
        variant.id !== undefined && variant.id !== null
          ? Number(variant.id)
          : null;
      const deleteFlag = variant._delete === true;

      // If _delete and existing ID -> soft delete variant
      if (variantId && deleteFlag) {
        await client.query(
          `UPDATE product_variants
           SET deleted_at = NOW(), updated_at = NOW()
           WHERE id = $1 AND product_id = $2 AND deleted_at IS NULL`,
          [variantId, productId],
        );
        continue;
      }

      // Normal create/update flow
      const sizeId =
        variant.size_id !== undefined && variant.size_id !== null
          ? Number(variant.size_id)
          : null;
      const colorId =
        variant.color_id !== undefined && variant.color_id !== null
          ? Number(variant.color_id)
          : null;
      const sku =
        variant.sku !== undefined && variant.sku !== null
          ? String(variant.sku)
          : null;

      const price =
        variant.price !== undefined && variant.price !== null
          ? Number(variant.price)
          : Number(body.default_price ?? productRow.default_price ?? 0);

      const initialQty =
        variant.initial_quantity !== undefined &&
        variant.initial_quantity !== null
          ? Number(variant.initial_quantity)
          : 0;

      // Basic sanity (you already validate on frontend, this is just guardrails)
      if (Number.isNaN(price) || price < 0) {
        throw new Error("Invalid variant price");
      }
      if (Number.isNaN(initialQty) || initialQty < 0) {
        throw new Error("Invalid variant initial_quantity");
      }

      if (variantId) {
        // Update existing variant
        await client.query(
          `UPDATE product_variants SET
             size_id = $3,
             color_id = $4,
             sku = $5,
             price = $6,
             initial_quantity = $7,
             updated_at = NOW()
           WHERE id = $1 AND product_id = $2 AND deleted_at IS NULL`,
          [variantId, productId, sizeId, colorId, sku, price, initialQty],
        );
      } else {
        // Insert new variant
        await client.query(
          `INSERT INTO product_variants
             (product_id, size_id, color_id, sku, price, initial_quantity)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [productId, sizeId, colorId, sku, price, initialQty],
        );
      }
    }

    await client.query("COMMIT");

    // 3) Return updated product WITH fresh variants (same shape as GET)
    const finalRes = await db.query(
      `SELECT p.*, (
        SELECT json_agg(row_to_json(pv))
        FROM product_variants pv
        WHERE pv.product_id = p.id AND pv.deleted_at IS NULL
      ) AS variants
      FROM products p
      WHERE p.id = $1 AND p.deleted_at IS NULL`,
      [productId],
    );

    if (!finalRes.rowCount) {
      // Should not happen after successful update, but handle anyway
      return NextResponse.json(
        { error: "Product not found after update" },
        { status: 404 },
      );
    }

    return NextResponse.json(finalRes.rows[0], { status: 200 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("PUT /api/products/[id] error:", err);
    return NextResponse.json(
      { error: "Error updating product", details: err?.message ?? String(err) },
      { status: 500 },
    );
  } finally {
    client.release();
  }
}

// -----------------------------
// DELETE Product (admin only, soft delete)
// -----------------------------
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
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
      [productId],
    );

    if (res.rowCount === 0) {
      return NextResponse.json(
        { error: "Product not found or already deleted" },
        { status: 404 },
      );
    }

    // Soft delete all its variants
    await db.query(
      `UPDATE product_variants
       SET deleted_at = NOW()
       WHERE product_id = $1 AND deleted_at IS NULL`,
      [productId],
    );

    return NextResponse.json({ message: "Product deleted" }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /products/:id failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

// -----------------------------
// PATCH Product (optional restore for soft deleted)
// -----------------------------
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
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
      [productId],
    );

    if (!res.rowCount) {
      return NextResponse.json(
        { error: "Product not found or not deleted" },
        { status: 404 },
      );
    }

    return NextResponse.json(
      { message: "Product restored", product: res.rows[0] },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("PATCH /products/:id failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
