// src/app/admin/layout.tsx

"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import  useAuth  from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  const isAdmin = user?.role === "admin";

  useEffect(() => {
    if (!isLoading && !isAdmin) {
      router.replace("/");
    }
  }, [isLoading, isAdmin, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground">Checking access…</p>
      </div>
    );
  }

  if (!isAdmin) {
    // brief fallback in case redirect hasn't happened yet
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-sm text-muted-foreground">
          You don&apos;t have access to the admin area.
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to store
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin</h1>
          <p className="text-sm text-muted-foreground">
            Manage products, orders and discounts.
          </p>
        </div>

        <nav className="flex flex-wrap gap-2 text-sm">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin")}
          >
            Dashboard
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/products")}
          >
            Products
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/orders")}
          >
            Orders
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/discounts")}
          >
            Discounts
          </Button>
        </nav>
      </header>

      <section>{children}</section>
    </div>
  );
}
