// src/app/api/v1/products/search/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";

type SearchRow = {
  product_id: number;
  product_name: string;
  variant_id: number;
  sku: string | null;
  price: string | number;
  initial_quantity: number;
  sold_quantity: number;
  current_quantity: number;
  category: string | null;
  brand: string | null;
  gender: string | null;
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

export async function GET(req: Request) {
  try {
    const u = new URL(req.url);
    const q = u.searchParams;

    // --- Pagination ---
    const limit = Math.max(1, Math.min(200, Number(q.get("limit") || "50")));
    const offset = Math.max(0, Number(q.get("offset") || "0"));

    const filters: string[] = [];
    const vals: any[] = [];

    function add(cond: string, val: any) {
      if (val === undefined || val === null) return;
      vals.push(val);
      // replace "?" with correct $index placeholder
      filters.push(cond.replace("?", `$${vals.length}`));
    }

    // Text search by product name
    const search = q.get("search");
    if (search && search.trim() !== "") {
      add("p.name ILIKE ?", `%${search.trim()}%`);
    }

    // Basic filters
    if (q.get("gender")) add("g.name = ?", q.get("gender"));
    if (q.get("category")) add("c.name = ?", q.get("category"));
    if (q.get("brand")) add("b.name = ?", q.get("brand"));
    if (q.get("size")) add("s.name = ?", q.get("size"));
    if (q.get("color")) add("col.name = ?", q.get("color"));

    // Price range
    const priceMinStr = q.get("price_min");
    if (priceMinStr && !Number.isNaN(Number(priceMinStr))) {
      add("pv.price >= ?", Number(priceMinStr));
    }

    const priceMaxStr = q.get("price_max");
    if (priceMaxStr && !Number.isNaN(Number(priceMaxStr))) {
      add("pv.price <= ?", Number(priceMaxStr));
    }

    // Availability
    if (q.get("available") === "true") {
      filters.push(`(pv.initial_quantity - COALESCE(sold.qty,0)) > 0`);
    }

    const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

    // Build SQL with dynamic filters + pagination
    const sql = `
      SELECT 
        p.id AS product_id,
        p.name AS product_name,
        pv.id AS variant_id,
        pv.sku,
        pv.price,
        pv.initial_quantity,
        COALESCE(sold.qty,0) AS sold_quantity,
        (pv.initial_quantity - COALESCE(sold.qty,0)) AS current_quantity,
        c.name AS category,
        b.name AS brand,
        g.name AS gender,
        s.name AS size,
        col.name AS color
      FROM product_variants pv
      JOIN products p ON p.id = pv.product_id
      LEFT JOIN categories c ON c.id = p.category_id
      LEFT JOIN brands b ON b.id = p.brand_id
      LEFT JOIN genders g ON g.id = p.gender_id
      LEFT JOIN sizes s ON s.id = pv.size_id
      LEFT JOIN colors col ON col.id = pv.color_id
      LEFT JOIN (
        SELECT product_variant_id, SUM(quantity) AS qty
        FROM order_items oi 
        JOIN orders o ON o.id = oi.order_id
        WHERE o.status NOT IN ('cancelled')
        GROUP BY product_variant_id
      ) sold ON sold.product_variant_id = pv.id
      ${where}
      ORDER BY p.id, pv.id
      LIMIT $${vals.length + 1}
      OFFSET $${vals.length + 2}
    `;

    vals.push(limit, offset);

    const res = await db.query(sql, vals);
    const rows = res.rows as SearchRow[];

    // --- Wrap in envelope + HATEOAS ---

    const basePath = "/api/v1/products/search";
    const queryWithoutPaging = (() => {
      const copy = new URLSearchParams(q.toString());
      copy.delete("limit");
      copy.delete("offset");
      const qs = copy.toString();
      return qs ? `${basePath}?${qs}` : basePath;
    })();

    const selfHref =
      queryWithoutPaging +
      (queryWithoutPaging.includes("?") ? "&" : "?") +
      `limit=${limit}&offset=${offset}`;

    const nextOffset = offset + limit;
    const prevOffset = Math.max(0, offset - limit);

    const nextHref =
      queryWithoutPaging +
      (queryWithoutPaging.includes("?") ? "&" : "?") +
      `limit=${limit}&offset=${nextOffset}`;

    const prevHref =
      queryWithoutPaging +
      (queryWithoutPaging.includes("?") ? "&" : "?") +
      `limit=${limit}&offset=${prevOffset}`;

    return NextResponse.json(
      {
        data: rows,
        pagination: {
          limit,
          offset,
          count: rows.length,
        },
        _links: {
          self: { href: selfHref },
          next: { href: nextHref },
          prev: offset > 0 ? { href: prevHref } : null,
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("GET /api/v1/products/search error:", err);
    return errorResponse(
      "PRODUCT_SEARCH_FAILED",
      "Failed to search products.",
      500,
    );
  }
}
