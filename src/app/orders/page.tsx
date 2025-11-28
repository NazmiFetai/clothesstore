// src/app/orders/page.tsx

"use client";

import { useEffect, useState } from "react";
import useAuth from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import type { Order, PaginatedResponse } from "@/lib/types";

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

type OrdersListResponse = PaginatedResponse<Order> | Order[];

export default function MyOrdersPage() {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = !!token && !!user;

  async function loadOrders(targetPage: number) {
    if (!token || !user) return;

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("page", String(targetPage));
      params.set("limit", String(limit));

      const result = await apiFetch<OrdersListResponse>(
        `/api/orders?${params.toString()}`,
        {},
        token
      );

      let data: Order[] = [];
      let totalCount = 0;

      if (Array.isArray(result)) {
        data = result;
        totalCount = result.length;
      } else if (Array.isArray((result as PaginatedResponse<Order>).data)) {
        const r = result as PaginatedResponse<Order>;
        data = r.data;
        totalCount = r.total ?? r.data.length;
      }

      // Only show orders created by this user.
      // Backend: orders.created_by references users.id
      const userId = String(user.id);
      const filtered = data.filter((o) =>
        o.created_by != null ? String(o.created_by) === userId : false
      );

      setOrders(filtered);
      setPage(targetPage);
      setTotal(filtered.length);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load orders.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && user) {
      void loadOrders(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user]);

  if (!isLoggedIn) {
    return (
      <div className="space-y-4">
        <h1 className="text-2xl font-semibold">My Orders</h1>
        <p className="text-sm text-muted-foreground">
          You must be logged in to view your orders.
        </p>
      </div>
    );
  }

  const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  const canPrev = page > 1;
  const canNext = orders.length === limit;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold">My Orders</h1>
      <p className="text-sm text-muted-foreground">
        Here you can see your past orders.
      </p>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">Order ID</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[120px]">Status</TableHead>
              <TableHead className="w-[120px] text-right">Items</TableHead>
              <TableHead className="w-[120px] text-right">Total</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm">
                  You have no orders yet.
                </TableCell>
              </TableRow>
            )}

            {orders.map((order) => {
              const date = new Date(order.created_at);
              const dateLabel = isNaN(date.getTime())
                ? order.created_at
                : date.toLocaleString();

              const itemsCount = Array.isArray(order.items)
                ? order.items.reduce((sum, i) => sum + i.quantity, 0)
                : 0;

              const totalLabel = (() => {
                const n = Number(order.total_amount as any);
                if (Number.isNaN(n)) return String(order.total_amount ?? "—");
                return n.toFixed(2);
              })();

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    {order.id}
                  </TableCell>
                  <TableCell className="text-sm">{dateLabel}</TableCell>
                  <TableCell className="text-xs capitalize">
                    {order.status}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {itemsCount}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {totalLabel}
                  </TableCell>
                </TableRow>
              );
            })}

            {loading && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm">
                  Loading…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">
          Page {page} of {totalPages} · {total} total
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev || loading}
            onClick={() => canPrev && void loadOrders(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext || loading}
            onClick={() => canNext && void loadOrders(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
