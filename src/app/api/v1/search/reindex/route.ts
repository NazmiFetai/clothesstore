// src/app/api/v1/search/reindex/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

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

export async function POST(req: Request) {
  // 1) Only admin can reindex
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return errorResponse(
      "UNAUTHORIZED",
      e?.message || "Not authorized.",
      e?.status || 403,
    );
  }

  const osUrl = process.env.OPENSEARCH_URL || "http://localhost:9200";

  try {
    // 2) Load all products from Postgres
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
      ORDER BY p.id ASC
    `;
    const res = await db.query(sql);
    const rows = res.rows;

    // 3) Drop index if it exists (ignore 404)
    try {
      const delResp = await fetch(`${osUrl}/products`, {
        method: "DELETE",
      });
      if (!delResp.ok && delResp.status !== 404) {
        const text = await delResp.text();
        console.error("OpenSearch delete index error:", delResp.status, text);
      }
    } catch (err) {
      console.error("OpenSearch delete index failed:", err);
    }

    // 4) Create index with a simple mapping
    const createResp = await fetch(`${osUrl}/products`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        mappings: {
          properties: {
            id: { type: "integer" },
            name: {
              type: "text",
              fields: {
                keyword: { type: "keyword" },
              },
            },
            description: { type: "text" },
            default_price: { type: "float" },
            category: { type: "keyword" },
            brand: { type: "keyword" },
            gender: { type: "keyword" },
          },
        },
      }),
    });

    if (!createResp.ok) {
      const text = await createResp.text();
      console.error("OpenSearch create index error:", createResp.status, text);
      return errorResponse(
        "OPENSEARCH_INDEX_CREATE_FAILED",
        "Failed to create products index in OpenSearch.",
        500,
      );
    }

    // 5) Build bulk payload
    const lines: string[] = [];

    for (const row of rows) {
      const doc = {
        id: Number(row.id),
        name: row.name,
        description: row.description,
        default_price: Number(row.default_price),
        category: row.category_name ?? null,
        brand: row.brand_name ?? null,
        gender: row.gender_name ?? null,
      };

      lines.push(
        JSON.stringify({
          index: { _index: "products", _id: row.id },
        }),
      );
      lines.push(JSON.stringify(doc));
    }

    const bulkBody = lines.length > 0 ? lines.join("\n") + "\n" : "";

    if (bulkBody) {
      const bulkResp = await fetch(`${osUrl}/_bulk`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: bulkBody,
      });

      if (!bulkResp.ok) {
        const text = await bulkResp.text();
        console.error("OpenSearch bulk index error:", bulkResp.status, text);
        return errorResponse(
          "OPENSEARCH_BULK_FAILED",
          "Failed to bulk index products into OpenSearch.",
          500,
        );
      }

      const bulkJson = await bulkResp.json();
      if (bulkJson.errors) {
        console.error("OpenSearch bulk response has errors:", bulkJson);
        // still return 200 but indicate partial failure
        return NextResponse.json(
          {
            message:
              "Reindex completed with errors. Check server logs for details.",
            indexed: rows.length,
            opensearch: {
              took: bulkJson.took,
              errors: bulkJson.errors,
            },
            _links: {
              search: { href: "/api/v1/search/products?q=*" },
            },
          },
          { status: 200 },
        );
      }
    }

    // 6) Done
    return NextResponse.json(
      {
        message: "Reindex completed.",
        indexed: rows.length,
        _links: {
          self: { href: "/api/v1/search/reindex" },
          search_example: {
            href: "/api/v1/search/products?q=Socks",
          },
        },
      },
      { status: 200 },
    );
  } catch (err: any) {
    console.error("Reindex error:", err);
    return errorResponse(
      "REINDEX_FAILED",
      err?.message ?? "Failed to reindex products.",
      500,
    );
  }
}
