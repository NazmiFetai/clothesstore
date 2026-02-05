// app/api/products/route.ts
import { NextResponse } from "next/server";
import db from "../../../lib/db";
import { requireRoleFromHeader } from "../../../lib/roles";

/* -------------------------------------------------------
   GET — Public (no token required)
------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    const offset = Number(url.searchParams.get("offset") || "0");

    const q = `
      SELECT
        p.*,
        (
          SELECT json_agg(row_to_json(pv))
          FROM product_variants pv
          WHERE pv.product_id = p.id AND pv.deleted_at IS NULL
        ) AS variants
      FROM products p
      WHERE p.deleted_at IS NULL
      ORDER BY p.created_at DESC
      LIMIT $1 OFFSET $2
    `;

    const result = await db.query(q, [limit, offset]);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("GET /products error:", err);
    return NextResponse.json({ error: "Failed to fetch products" }, { status: 500 });
  }
}

/* -------------------------------------------------------
   POST — Create Product (admin, advanced_user)
------------------------------------------------------- */
export async function POST(req: Request) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);

    const body = await req.json();

    if (!body.name || !body.default_price) {
      return NextResponse.json(
        { error: "name and default_price are required" },
        { status: 400 }
      );
    }

    const q = `
      INSERT INTO products (name, description, category_id, brand_id, gender_id, default_price)
      VALUES ($1,$2,$3,$4,$5,$6)
      RETURNING *
    `;
    const vals = [
      body.name,
      body.description || null,
      body.category_id || null,
      body.brand_id || null,
      body.gender_id || null,
      body.default_price,
    ];

    const res = await db.query(q, vals);
    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 403 }
    );
  }
}

/* -------------------------------------------------------
   PUT — Update Product (admin, advanced_user)
------------------------------------------------------- */
export async function PUT(req: Request) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);

    const body = await req.json();

    if (!body.id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const q = `
      UPDATE products SET
        name = COALESCE($2, name),
        description = COALESCE($3, description),
        category_id = COALESCE($4, category_id),
        brand_id = COALESCE($5, brand_id),
        gender_id = COALESCE($6, gender_id),
        default_price = COALESCE($7, default_price),
        updated_at = NOW()
      WHERE id = $1 AND deleted_at IS NULL
      RETURNING *
    `;

    const vals = [
      body.id,
      body.name || null,
      body.description || null,
      body.category_id || null,
      body.brand_id || null,
      body.gender_id || null,
      body.default_price || null,
    ];

    const res = await db.query(q, vals);

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Product not found or deleted" }, { status: 404 });
    }

    return NextResponse.json(res.rows[0], { status: 200 });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message },
      { status: err.status || 403 }
    );
  }
}

/* -------------------------------------------------------
   DELETE — Soft Delete Product (admin only)
------------------------------------------------------- */
export async function DELETE(req: Request) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);

    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    // Soft delete product
    const res = await db.query(
      `UPDATE products SET deleted_at = NOW() WHERE id = $1 AND deleted_at IS NULL RETURNING *`,
      [id]
    );

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Product not found or already deleted" }, { status: 404 });
    }

    // Optional: soft delete variants
    await db.query(
      `UPDATE product_variants SET deleted_at = NOW() WHERE product_id = $1 AND deleted_at IS NULL`,
      [id]
    );

    return NextResponse.json({ message: "Product soft deleted" }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /products failed:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
