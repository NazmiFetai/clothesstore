import { NextResponse } from "next/server";
import { decodeAuthHeader } from "./lib/roles";

export function middleware(req: Request) {
  const url = new URL(req.url);
  const pathname = url.pathname;

  // Public endpoints
  if (pathname.startsWith("/api/auth")) return NextResponse.next();
  if (pathname.startsWith("/api/products") && req.method === "GET")
    return NextResponse.next();

  // For all protected endpoints → don't verify token here
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/products/:path*",
    "/api/orders/:path*",
    "/api/reports/:path*",
    "/api/users/:path*",
  ],
};
