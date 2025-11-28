// src/app/api/reports/daily/route.ts
import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { requireRoleFromHeader } from "../../../../lib/roles";

export async function GET(req: Request) {
  try {
    // Only admins / advanced_users should see revenue
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: e.status || 403 });
  }

  const url = new URL(req.url);
  const dateParam = url.searchParams.get("date");

  // Expecting YYYY-MM-DD; if missing, default to today (server local)
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const fallbackDate = `${yyyy}-${mm}-${dd}`;

  const dateStr = dateParam || fallbackDate;

  // Basic sanity check
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return NextResponse.json(
      { error: "Invalid date format. Use YYYY-MM-DD." },
      { status: 400 }
    );
  }

  try {
    // 1) Orders + revenue
    const summaryRes = await db.query(
      `
      SELECT
        $1::date AS date,
        COUNT(*) AS orders,
        COALESCE(SUM(o.total_amount), 0) AS revenue
      FROM orders o
      WHERE o.created_at::date = $1::date
        AND o.status NOT IN ('cancelled', 'returned')
      `,
      [dateStr]
    );

    const summaryRow = summaryRes.rows[0] || {
      date: dateStr,
      orders: 0,
      revenue: 0,
    };

    // 2) Top products (by units sold)
    const topRes = await db.query(
      `
      SELECT
        p.id AS product_id,
        p.name,
        SUM(oi.quantity) AS units
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN product_variants pv ON pv.id = oi.product_variant_id
      JOIN products p ON p.id = pv.product_id
      WHERE o.created_at::date = $1::date
        AND o.status NOT IN ('cancelled', 'returned')
      GROUP BY p.id, p.name
      ORDER BY units DESC
      LIMIT 5
      `,
      [dateStr]
    );

    const topProducts = topRes.rows.map((r) => ({
      productId: String(r.product_id),
      name: r.name as string,
      units: Number(r.units) || 0,
    }));

    const responseBody = {
      date: dateStr,
      orders: Number(summaryRow.orders) || 0,
      revenue: Number(summaryRow.revenue) || 0,
      topProducts,
    };

    return NextResponse.json(responseBody, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/reports/daily failed:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
