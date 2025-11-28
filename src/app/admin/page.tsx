// src/app/admin/page.tsx

"use client";

import { useEffect, useState } from "react";
import useAuth from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import type { DailyReport, Order, PaginatedResponse } from "@/lib/types";

import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

// Extend Order with client + user fields returned from /api/orders
type RecentOrder = Order & {
  first_name?: string | null;
  last_name?: string | null;
  client_email?: string | null;
  created_by_username?: string | null;
};

type OrdersListResponse = PaginatedResponse<RecentOrder> | RecentOrder[];

export default function AdminDashboardPage() {
  const { token, user } = useAuth();
  const role = (user?.role ?? "") as string;
  const isAdmin = role === "admin" || role === "advanced_user";

  const [report, setReport] = useState<DailyReport | null>(null);
  const [recentOrders, setRecentOrders] = useState<RecentOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ✅ Hooks are ALWAYS called, regardless of isAdmin
  useEffect(() => {
    if (!token || !isAdmin) return;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // --- Daily report ---
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, "0");
        const dd = String(today.getDate()).padStart(2, "0");
        const dateStr = `${yyyy}-${mm}-${dd}`;

        const rep = await apiFetch<DailyReport>(
          `/api/reports/daily?date=${dateStr}`,
          {},
          token
        );
        setReport(rep);

        // --- Recent orders ---
        const ordersRes = await apiFetch<OrdersListResponse>(
          "/api/orders?limit=5&page=1",
          {},
          token
        );

        if (Array.isArray(ordersRes)) {
          setRecentOrders(ordersRes);
        } else {
          const r = ordersRes as PaginatedResponse<RecentOrder>;
          setRecentOrders(r.data ?? []);
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error
            ? err.message
            : "Failed to load dashboard data.";
        setError(msg);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [token, isAdmin]);

  // ------ SAFE REVENUE LABEL ------
  const revenueLabel = (() => {
    if (!report || report.revenue === undefined || report.revenue === null) {
      return "0.00";
    }
    const n = Number(report.revenue as any);
    if (Number.isNaN(n)) return "0.00";
    return n.toFixed(2);
  })();

  // ✅ Now it’s safe to conditionally return AFTER hooks
  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">Admin dashboard</h1>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Admin dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Overview of today&apos;s performance and recent activity.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* KPI cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">
            Orders today ({report?.date ?? "—"})
          </p>
          <p className="text-2xl font-semibold">
            {loading ? "…" : report?.orders ?? 0}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Revenue today</p>
          <p className="text-2xl font-semibold">
            {loading ? "…" : revenueLabel}
          </p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">
            Top product (units)
          </p>
          <p className="text-sm font-semibold">
            {loading
              ? "Loading…"
              : report && report.topProducts && report.topProducts.length > 0
              ? `${report.topProducts[0].name} (${report.topProducts[0].units})`
              : "No data"}
          </p>
        </div>
      </div>

      {/* Recent orders */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Recent orders</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => (window.location.href = "/admin/orders")}
          >
            View all
          </Button>
        </div>
        <div className="rounded-md border overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[80px]">ID</TableHead>
                <TableHead>Client</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[100px] text-right">Items</TableHead>
                <TableHead className="w-[120px] text-right">Total</TableHead>
                <TableHead className="w-[100px] text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentOrders.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm">
                    No recent orders.
                  </TableCell>
                </TableRow>
              )}
              {recentOrders.map((o) => {
                const d = new Date(o.created_at);
                const dateLabel = isNaN(d.getTime())
                  ? o.created_at
                  : d.toLocaleString();

                const itemsCount = Array.isArray(o.items)
                  ? o.items.reduce((sum, i) => sum + i.quantity, 0)
                  : 0;

                const totalLabel = (() => {
                  const n = Number(o.total_amount as any);
                  if (Number.isNaN(n)) return String(o.total_amount ?? "—");
                  return n.toFixed(2);
                })();

                const clientLabel =
                  [o.first_name, o.last_name].filter(Boolean).join(" ") ||
                  o.client_email ||
                  o.created_by_username ||
                  (o.client_id != null
                    ? `Client #${o.client_id}`
                    : o.created_by != null
                    ? `User #${o.created_by}`
                    : "—");

                return (
                  <TableRow key={o.id}>
                    <TableCell className="font-mono text-xs">{o.id}</TableCell>
                    <TableCell className="text-xs">{clientLabel}</TableCell>
                    <TableCell className="text-xs">{dateLabel}</TableCell>
                    <TableCell className="text-right text-xs">
                      {itemsCount}
                    </TableCell>
                    <TableCell className="text-right text-xs">
                      {totalLabel}
                    </TableCell>
                    <TableCell className="text-right text-xs capitalize">
                      {o.status}
                    </TableCell>
                  </TableRow>
                );
              })}
              {loading && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm">
                    Loading…
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
