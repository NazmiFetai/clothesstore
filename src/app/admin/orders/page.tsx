// src/app/admin/orders/page.tsx

"use client";

import { useEffect, useState, ChangeEvent } from "react";
import useAuth from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import type { PaginatedResponse } from "@/lib/types";

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

// --- Match your backend shape exactly ---
type AdminOrderItem = {
  id: number;
  order_id: number;
  product_variant_id: number;
  unit_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
};

type AdminOrderStatus =
  | "pending"
  | "processing"
  | "confirmed"
  | "cancelled"
  | "shipped"
  | "delivered"
  | "returned";

type AdminOrder = {
  id: string;
  client_id: string | null;
  created_by: string | null;
  status: AdminOrderStatus | string;
  payment_method: string | null;
  total_amount: string; // e.g. "135.00"
  created_at: string;
  updated_at: string;
  items: AdminOrderItem[];

  // from JOIN on clients
  first_name?: string | null;
  last_name?: string | null;
  client_email?: string | null;
};

// API may be array or paginated object
type OrdersListResponse = PaginatedResponse<AdminOrder> | AdminOrder[];

// Allowed status values for the dropdown
const ALL_STATUSES: AdminOrderStatus[] = [
  "pending",
  "processing",
  "confirmed",
  "cancelled",
];

export default function AdminOrdersPage() {
  const { token, user } = useAuth();
  const role = (user?.role ?? "") as string;
  const isAdmin = role === "admin" || role === "advanced_user";

  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [statusDraft, setStatusDraft] = useState<
    Record<string, AdminOrderStatus>
  >();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Orders</h2>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  async function loadOrders(targetPage: number) {
    if (!token) return;

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

      let data: AdminOrder[] = [];
      let totalCount = 0;

      if (Array.isArray(result)) {
        data = result;
        totalCount = result.length;
      } else if (Array.isArray((result as PaginatedResponse<AdminOrder>).data)) {
        const r = result as PaginatedResponse<AdminOrder>;
        data = r.data;
        totalCount = r.total ?? r.data.length;
      }

      setOrders(data);
      setPage(targetPage);
      setTotal(totalCount);

      // status draft map
      const draft: Record<string, AdminOrderStatus> = {};
      for (const o of data) {
        const s = o.status as AdminOrderStatus;
        draft[o.id] = ALL_STATUSES.includes(s) ? s : "pending";
      }
      setStatusDraft(draft);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load orders.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token && isAdmin) {
      void loadOrders(1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, isAdmin]);

  const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  const canPrev = page > 1;
  const canNext = orders.length === limit;

  async function updateStatus(orderId: string, status: AdminOrderStatus) {
    if (!token) return;

    setUpdatingId(orderId);
    setError(null);

    try {
      await apiFetch<AdminOrder>(
        `/api/orders/${orderId}`,
        {
          method: "PUT",
          body: JSON.stringify({ status }),
        },
        token
      );

      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status } : o))
      );
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update order status.";
      setError(msg);
    } finally {
      setUpdatingId(null);
    }
  }

  function handleStatusChange(
    orderId: string,
    e: ChangeEvent<HTMLSelectElement>
  ) {
    const value = e.target.value as AdminOrderStatus;
    setStatusDraft((prev) => ({ ...(prev ?? {}), [orderId]: value }));
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Orders</h2>
          <p className="text-sm text-muted-foreground">
            Manage customer orders and update their status.
          </p>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[80px]">ID</TableHead>
              <TableHead>Client</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[120px] text-right">Items</TableHead>
              <TableHead className="w-[120px] text-right">Total</TableHead>
              <TableHead className="w-[220px] text-right">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm">
                  No orders found.
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

              const draftStatus =
                statusDraft?.[order.id] ??
                ((order.status as AdminOrderStatus) || "pending");

              const clientLabel =
                [order.first_name, order.last_name]
                  .filter(Boolean)
                  .join(" ") ||
                order.client_email ||
                (order.client_id ? `Client #${order.client_id}` : "—");

              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-xs">
                    {order.id}
                  </TableCell>
                  <TableCell className="text-xs">{clientLabel}</TableCell>
                  <TableCell className="text-xs">{dateLabel}</TableCell>
                  <TableCell className="text-right text-sm">
                    {itemsCount}
                  </TableCell>
                  <TableCell className="text-right text-sm">
                    {totalLabel}
                  </TableCell>
                  <TableCell className="text-right text-xs">
                    <div className="flex items-center justify-end gap-2">
                      <select
                        className="border rounded-md px-2 py-1 text-xs bg-background"
                        value={draftStatus}
                        onChange={(e) => handleStatusChange(order.id, e)}
                        disabled={updatingId === order.id}
                      >
                        {ALL_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingId === order.id}
                        onClick={() =>
                          void updateStatus(
                            order.id,
                            (statusDraft?.[order.id] ??
                              (order.status as AdminOrderStatus)) ||
                              "pending"
                          )
                        }
                      >
                        {updatingId === order.id ? "Saving…" : "Update"}
                      </Button>
                    </div>
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
