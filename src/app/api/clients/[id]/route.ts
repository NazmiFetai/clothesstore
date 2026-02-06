// src/app/api/clients/[id]/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

type ClientRow = {
  id: number;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
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

// -----------------------------
// GET /api/clients/[id]
// -----------------------------
export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params;
  const clientId = Number(id);

  if (Number.isNaN(clientId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid client id.", 400);
  }

  const res = await db.query(`SELECT * FROM clients WHERE id = $1`, [clientId]);

  if (!res.rowCount) {
    return errorResponse("CLIENT_NOT_FOUND", "Client not found.", 404);
  }

  return NextResponse.json(res.rows[0], { status: 200 });
}

// -----------------------------
// PUT /api/clients/[id]
// (admin + advanced_user)
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
    return errorResponse(
      "UNAUTHORIZED",
      e?.message || "Not authorized.",
      e?.status || 403,
    );
  }

  const { id } = await ctx.params;
  const clientId = Number(id);

  if (Number.isNaN(clientId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid client id.", 400);
  }

  const body = await req.json();

  const res = await db.query(
    `
  UPDATE clients SET
    first_name  = COALESCE($2, first_name),
    last_name   = COALESCE($3, last_name),
    email       = COALESCE($4, email),
    phone       = COALESCE($5, phone),
    address     = COALESCE($6, address),
    city        = COALESCE($7, city),
    postal_code = COALESCE($8, postal_code),
    country     = COALESCE($9, country)
  WHERE id = $1
  RETURNING *
  `,
    [
      clientId,
      body.first_name ?? null,
      body.last_name ?? null,
      body.email ?? null,
      body.phone ?? null,
      body.address ?? null,
      body.city ?? null,
      body.postal_code ?? null,
      body.country ?? null,
    ],
  );

  if (!res.rowCount) {
    return errorResponse("CLIENT_NOT_FOUND", "Client not found.", 404);
  }

  return NextResponse.json(res.rows[0], { status: 200 });
}

// -----------------------------
// DELETE /api/clients/[id]
// (admin only)
// -----------------------------
export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    await requireRoleFromHeader(req.headers.get("authorization"), ["admin"]);
  } catch (e: any) {
    return errorResponse(
      "UNAUTHORIZED",
      e?.message || "Not authorized.",
      e?.status || 403,
    );
  }

  const { id } = await ctx.params;
  const clientId = Number(id);

  if (Number.isNaN(clientId)) {
    return errorResponse("VALIDATION_ERROR", "Invalid client id.", 400);
  }

  const res = await db.query(`DELETE FROM clients WHERE id = $1 RETURNING id`, [
    clientId,
  ]);

  if (!res.rowCount) {
    return errorResponse("CLIENT_NOT_FOUND", "Client not found.", 404);
  }

  return new NextResponse(null, { status: 204 });
}
