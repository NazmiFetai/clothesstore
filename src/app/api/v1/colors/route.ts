// src/app/api/colors/route.ts
import { NextResponse } from "next/server";
import db from "../../../lib/db";

// GET /api/colors
export async function GET() {
  const res = await db.query(
    `SELECT id, name 
     FROM colors 
     ORDER BY name`
  );
  return NextResponse.json(res.rows);
}
