// src/app/api/products/search/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";

export async function GET(req: Request) {
  const u = new URL(req.url);
  const q = u.searchParams;

  const filters: string[] = [];
  const vals: any[] = [];

  function add(cond: string, val: any) {
    if (val === undefined || val === null) return;
    vals.push(val);
    filters.push(cond.replace("?", `$${vals.length}`));
  }

  // NEW: text search by product name
  const search = q.get("search");
  if (search && search.trim() !== "") {
    add("p.name ILIKE ?", `%${search.trim()}%`);
  }

  if (q.get("gender")) add("g.name = ?", q.get("gender"));
  if (q.get("category")) add("c.name = ?", q.get("category"));
  if (q.get("brand")) add("b.name = ?", q.get("brand"));
  if (q.get("size")) add("s.name = ?", q.get("size"));
  if (q.get("color")) add("col.name = ?", q.get("color"));

  const priceMinStr = q.get("price_min");
  if (priceMinStr && !Number.isNaN(Number(priceMinStr))) {
    add("pv.price >= ?", Number(priceMinStr));
  }

  const priceMaxStr = q.get("price_max");
  if (priceMaxStr && !Number.isNaN(Number(priceMaxStr))) {
    add("pv.price <= ?", Number(priceMaxStr));
  }

  if (q.get("available") === "true") {
    filters.push(`(pv.initial_quantity - COALESCE(sold.qty,0)) > 0`);
  }

  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";

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
    LIMIT 200
  `;

  const res = await db.query(sql, vals);

  return NextResponse.json(res.rows);
}
