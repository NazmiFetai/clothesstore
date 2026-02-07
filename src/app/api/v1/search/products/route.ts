// src/app/api/v1/search/products/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { checkRateLimit } from "@/lib/rate-limit";

type ProductSearchResource = {
  id: number;
  name: string;
  description: string | null;
  defaultPrice: number;
  category: string | null;
  brand: string | null;
  gender: string | null;
  _links: {
    self: { href: string };
    variants: { href: string };
  };
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

function toResource(row: any): ProductSearchResource {
  return {
    id: Number(row.id),
    name: row.name,
    description: row.description,
    defaultPrice: Number(row.default_price),
    category: row.category ?? row.category_name ?? null,
    brand: row.brand ?? row.brand_name ?? null,
    gender: row.gender ?? row.gender_name ?? null,
    _links: {
      self: { href: `/api/v1/products/${row.id}` },
      variants: { href: `/api/v1/products/${row.id}` },
    },
  };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);

    // identify client (IP) for rate limit
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
      req.headers.get("x-real-ip") ||
      "unknown";

    const q = url.searchParams.get("q") || url.searchParams.get("search") || "";
    const limit = Number(url.searchParams.get("limit") || "20");
    const offset = Number(url.searchParams.get("offset") || "0");

    if (!q || !q.trim()) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Query parameter 'q' (or 'search') is required.",
        400,
      );
    }

    const cleanedQ = q.trim();
    const basePath = "/api/v1/search/products";

    // 🔹 Rate limit: 60 search requests per 60s per IP
    const rlKeyBase = `products:search:${ip}`;
    const rl = await checkRateLimit(rlKeyBase, 60, 60);

    if (!rl.allowed) {
      const res = NextResponse.json(
        {
          error: {
            code: "RATE_LIMITED",
            message: `Too many search requests. Retry after ${rl.retryAfterSeconds}s.`,
          },
        },
        { status: 429 },
      );
      res.headers.set("Retry-After", String(rl.retryAfterSeconds ?? 60));
      return res;
    }

    // -----------------------------
    // 1) Try OpenSearch first
    // -----------------------------
    const osUrl = process.env.OPENSEARCH_URL || "http://localhost:9200";

    let usedOpenSearch = false;
    let results: ProductSearchResource[] = [];

    try {
      const body = {
        from: offset,
        size: limit,
        query: {
          multi_match: {
            query: cleanedQ,
            fields: ["name^3", "description", "category", "brand", "gender"],
          },
        },
      };

      const resp = await fetch(`${osUrl}/products/_search`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(body),
      });

      // If the index does not exist => fall back to DB (no error)
      if (resp.status === 404) {
        console.warn(
          "OpenSearch index 'products' not found. Falling back to DB search.",
        );
      } else if (!resp.ok) {
        const text = await resp.text();
        console.error("OpenSearch search error:", resp.status, text);
        // we still fall back to DB instead of throwing 500
      } else {
        const data = (await resp.json()) as any;
        const hits = data.hits?.hits ?? [];

        results = hits.map((h: any) => {
          const src = h._source ?? {};
          return toResource({
            id: src.id,
            name: src.name,
            description: src.description,
            default_price: src.default_price ?? src.price ?? 0,
            category: src.category ?? null,
            brand: src.brand ?? null,
            gender: src.gender ?? null,
          });
        });

        usedOpenSearch = true;
      }
    } catch (err) {
      // Any OpenSearch/network error -> log, then fall back to DB
      console.error("OpenSearch fetch failed:", err);
    }

    // -----------------------------
    // 2) Fallback: DB search
    // -----------------------------
    if (!usedOpenSearch) {
      try {
        const sql = `
          SELECT
            p.id,
            p.name,
            p.description,
            p.default_price,
            c.name AS category_name,
            b.name AS brand_name,
            g.name AS gender_name
          FROM products p
          LEFT JOIN categories c ON c.id = p.category_id
          LEFT JOIN brands b ON b.id = p.brand_id
          LEFT JOIN genders g ON g.id = p.gender_id
          WHERE p.deleted_at IS NULL
            AND (p.name ILIKE $1 OR p.description ILIKE $1)
          ORDER BY p.created_at DESC
          LIMIT $2 OFFSET $3
        `;

        const dbRes = await db.query(sql, [`%${cleanedQ}%`, limit, offset]);

        results = dbRes.rows.map((row: any) =>
          toResource({
            ...row,
            category: row.category_name,
            brand: row.brand_name,
            gender: row.gender_name,
          }),
        );
      } catch (err: any) {
        console.error("DB fallback search failed:", err);
        return errorResponse("SEARCH_FAILED", "Error searching products.", 500);
      }
    }

    const responseBody = {
      data: results,
      source: usedOpenSearch ? "opensearch" : "database",
      pagination: {
        limit,
        offset,
        count: results.length,
      },
      _links: {
        self: {
          href: `${basePath}?q=${encodeURIComponent(
            cleanedQ,
          )}&limit=${limit}&offset=${offset}`,
        },
        products: {
          href: "/api/v1/products",
        },
      },
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/v1/search/products error:", err);
    return errorResponse("SEARCH_FAILED", "Error searching products.", 500);
  }
}
