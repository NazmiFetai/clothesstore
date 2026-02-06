// src/app/api/brands/route.ts
import { NextResponse } from "next/server";
import db from "@/lib/db";

// GET /api/brands
export async function GET() {
  const res = await db.query(
    `SELECT id, name, description 
     FROM brands 
     ORDER BY name`,
  );
  return NextResponse.json(res.rows);
}
