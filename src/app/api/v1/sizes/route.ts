// src/app/api/sizes/route.ts
import { NextResponse } from "next/server";
import db from "../../../lib/db";

// GET /api/sizes
export async function GET() {
  const res = await db.query(
    `SELECT id, name 
     FROM sizes 
     ORDER BY name`
  );
  return NextResponse.json(res.rows);
}
