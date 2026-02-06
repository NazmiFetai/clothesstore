// src/app/api/clients/route.ts

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

// GET /api/clients
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const limit = Number(url.searchParams.get("limit") || "50");
    const offset = Number(url.searchParams.get("offset") || "0");

    // only admins/advanced can list clients
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);

    const q = `
      SELECT *
      FROM clients
      ORDER BY created_at DESC
      LIMIT $1 OFFSET $2
    `;
    const result = await db.query(q, [limit, offset]);

    return NextResponse.json(result.rows, { status: 200 });
  } catch (err: any) {
    console.error("GET /api/clients error:", err);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: err.status || 500 },
    );
  }
}

// POST /api/clients
export async function POST(req: Request) {
  const client = await db.getClient();

  try {
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);

    const body = await req.json();

    if (!body.first_name && !body.last_name && !body.email) {
      return NextResponse.json(
        { error: "At least one of first_name, last_name or email is required" },
        { status: 400 },
      );
    }

    await client.query("BEGIN");

    const q = `
      INSERT INTO clients
        (first_name, last_name, email, phone, address, city, postal_code, country)
      VALUES
        ($1,$2,$3,$4,$5,$6,$7,$8)
      RETURNING *
    `;

    const vals = [
      body.first_name || null,
      body.last_name || null,
      body.email || null,
      body.phone || null,
      body.address || null,
      body.city || null,
      body.postal_code || null,
      body.country || null,
    ];

    const res = await client.query(q, vals);

    await client.query("COMMIT");

    return NextResponse.json(res.rows[0], { status: 201 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("POST /api/clients error:", err);
    return NextResponse.json(
      {
        error: "Failed to create client",
        details: err?.message ?? String(err),
      },
      { status: err.status || 500 },
    );
  } finally {
    client.release();
  }
}
