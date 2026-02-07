// src/app/api/v1/products/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";
import { getCache, setCache } from "@/lib/redis";
import { checkRateLimit } from "@/lib/rate-limit";

type ProductRow = {
  id: number;
  name: string;
  description: string | null;
  category_id: number | null;
  brand_id: number | null;
  gender_id: number | null;
  default_price: string | number;
  active: boolean;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  variants?: unknown;
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

// HATEOAS builder for a single product
function toProductResource(row: ProductRow) {
  return {
    ...row,
    _links: {
      self: { href: `/api/v1/products/${row.id}` },
      // variants are included on the detail endpoint
      variants: { href: `/api/v1/products/${row.id}` },
      // stock endpoint
      quantity: { href: `/api/v1/products/${row.id}/quantity` },
    },
  };
}

/* -------------------------------------------------------
   GET — Public (no token required)
   Returns: { data: ProductResource[], pagination, _links }
   + Redis caching
   + Rate limiting via Redis (checkRateLimit)
------------------------------------------------------- */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    const offset = Number(url.searchParams.get("offset") || "0");

    // Identify the client for rate limiting (IP-based)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    // 120 requests per 60 seconds per IP on product listing
    const rlKeyBase = `products:list:${ip}`;
    const rl = await checkRateLimit(rlKeyBase, 120, 60);

    if (!rl.allowed) {
      const res = NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Too many requests. Retry after ${rl.retryAfterSeconds}s.`,
          },
        },
        { status: 429 },
      );
      res.headers.set("Retry-After", String(rl.retryAfterSeconds ?? 60));
      return res;
    }

    const cacheKey = `products:list:${limit}:${offset}`;

    // 1) Try cache first
    const cached = await getCache<any>(cacheKey);
    if (cached) {
      return NextResponse.json(cached, { status: 200 });
    }

    // 2) Load from DB
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
    const resources = (result.rows as ProductRow[]).map(toProductResource);

    const basePath = "/api/v1/products";

    const body = {
      data: resources,
      pagination: {
        limit,
        offset,
        count: resources.length,
      },
      _links: {
        self: {
          href: `${basePath}?limit=${limit}&offset=${offset}`,
        },
        next: {
          href: `${basePath}?limit=${limit}&offset=${offset + limit}`,
        },
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
    };

    // 3) Write to cache (60s TTL)
    await setCache(cacheKey, body, 60);

    return NextResponse.json(body, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/v1/products error:", err);
    return errorResponse(
      "PRODUCT_LIST_FAILED",
      "Failed to fetch products.",
      500,
    );
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
  } catch (err: any) {
    return errorResponse(
      "UNAUTHORIZED",
      err?.message || "Not authorized.",
      err?.status || 403,
    );
  }

  try {
    const body = await req.json();

    if (!body.name || !body.default_price) {
      return errorResponse(
        "VALIDATION_ERROR",
        "name and default_price are required.",
        400,
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
    const row = res.rows[0] as ProductRow;
    const resource = toProductResource(row);

    const response = NextResponse.json(resource, { status: 201 });
    response.headers.set("Location", `/api/v1/products/${row.id}`);
    return response;
  } catch (err: any) {
    console.error("POST /api/v1/products error:", err);
    return errorResponse(
      "PRODUCT_CREATE_FAILED",
      err?.message || "Failed to create product.",
      err?.status || 500,
    );
  }
}

/* -------------------------------------------------------
   PUT — Update Product (admin, advanced_user)
   NOTE: canonical update is /api/v1/products/:id (see [id]/route.ts).
   This endpoint is kept for compatibility (expects body.id).
------------------------------------------------------- */
export async function PUT(req: Request) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);
  } catch (err: any) {
    return errorResponse(
      "UNAUTHORIZED",
      err?.message || "Not authorized.",
      err?.status || 403,
    );
  }

  try {
    const body = await req.json();

    if (!body.id) {
      return errorResponse("VALIDATION_ERROR", "id is required.", 400);
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
      return errorResponse(
        "PRODUCT_NOT_FOUND",
        "Product not found or deleted.",
        404,
      );
    }

    const resource = toProductResource(res.rows[0] as ProductRow);
    return NextResponse.json(resource, { status: 200 });
  } catch (err: any) {
    console.error("PUT /api/v1/products error:", err);
    return errorResponse(
      "PRODUCT_UPDATE_FAILED",
      err?.message || "Failed to update product.",
      err?.status || 500,
    );
  }
}

/* -------------------------------------------------------
   DELETE — Soft Delete Product (admin only)
   NOTE: canonical delete is /api/v1/products/:id.
   This is legacy: expects ?id=
------------------------------------------------------- */
export async function DELETE(req: Request) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (err: any) {
    return errorResponse(
      "UNAUTHORIZED",
      err?.message || "Not authorized.",
      err?.status || 403,
    );
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");

    if (!id) {
      return errorResponse("VALIDATION_ERROR", "id is required.", 400);
    }

    const res = await db.query(
      `UPDATE products
       SET deleted_at = NOW()
       WHERE id = $1 AND deleted_at IS NULL
       RETURNING *`,
      [id],
    );

    if (res.rowCount === 0) {
      return errorResponse(
        "PRODUCT_NOT_FOUND",
        "Product not found or already deleted.",
        404,
      );
    }

    await db.query(
      `UPDATE product_variants
       SET deleted_at = NOW()
       WHERE product_id = $1 AND deleted_at IS NULL`,
      [id],
    );

    return NextResponse.json(
      {
        message: "Product soft deleted.",
        _links: {
          self: { href: `/api/v1/products/${id}` },
          restore: { href: `/api/v1/products/${id}`, method: "PATCH" },
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("DELETE /api/v1/products failed:", err);
    return errorResponse(
      "PRODUCT_DELETE_FAILED",
      "Internal server error.",
      500,
    );
  }
}
