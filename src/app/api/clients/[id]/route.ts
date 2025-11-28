// src/app/api/clients/[id]/route.ts

import { NextResponse } from "next/server";
import db from "../../../../lib/db";
import { requireRoleFromHeader } from "../../../../lib/roles";

type Params = {
  params: { id: string };
};

// GET /api/clients/:id
export async function GET(req: Request, { params }: Params) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);
    const p = await params;
    const id = Number(p.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const res = await db.query(`SELECT * FROM clients WHERE id = $1`, [id]);
    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(res.rows[0], { status: 200 });
  } catch (err: any) {
    console.error("GET /api/clients/:id error:", err);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: err.status || 500 }
    );
  }
}

// PUT /api/clients/:id
export async function PUT(req: Request, { params }: Params) {
  const client = await db.getClient();
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), [
      "admin",
      "advanced_user",
    ]);

    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const body = await req.json();

    await client.query("BEGIN");

    const q = `
      UPDATE clients SET
        first_name  = COALESCE($2, first_name),
        last_name   = COALESCE($3, last_name),
        email       = COALESCE($4, email),
        phone       = COALESCE($5, phone),
        address     = COALESCE($6, address),
        city        = COALESCE($7, city),
        postal_code = COALESCE($8, postal_code),
        country     = COALESCE($9, country),
        created_at  = created_at -- unchanged
      WHERE id = $1
      RETURNING *
    `;

    const vals = [
      id,
      body.first_name ?? null,
      body.last_name ?? null,
      body.email ?? null,
      body.phone ?? null,
      body.address ?? null,
      body.city ?? null,
      body.postal_code ?? null,
      body.country ?? null,
    ];

    const res = await client.query(q, vals);
    await client.query("COMMIT");

    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json(res.rows[0], { status: 200 });
  } catch (err: any) {
    await client.query("ROLLBACK");
    console.error("PUT /api/clients/:id error:", err);
    return NextResponse.json(
      {
        error: "Failed to update client",
        details: err?.message ?? String(err),
      },
      { status: err.status || 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE /api/clients/:id
export async function DELETE(req: Request, { params }: Params) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);

    const id = Number(params.id);
    if (!id || Number.isNaN(id)) {
      return NextResponse.json({ error: "Invalid id" }, { status: 400 });
    }

    const res = await db.query(
      `DELETE FROM clients WHERE id = $1 RETURNING *`,
      [id]
    );
    if (res.rowCount === 0) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    return NextResponse.json({ message: "Client deleted" }, { status: 200 });
  } catch (err: any) {
    console.error("DELETE /api/clients/:id error:", err);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: err.status || 500 }
    );
  }
}
