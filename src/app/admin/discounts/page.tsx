// src/app/admin/discounts/page.tsx

"use client";

import { useEffect, useState } from "react";
import useAuth from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import type { Discount } from "@/lib/types";

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

type DiscountListResponse = { data: Discount[] } | Discount[];

export default function AdminDiscountsPage() {
  const { token, user } = useAuth();
  const role = (user?.role ?? "") as string;
  const isAdmin = role === "admin" || role === "advanced_user";

  const [discounts, setDiscounts] = useState<Discount[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Discounts</h2>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  async function loadDiscounts() {
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const result = await apiFetch<DiscountListResponse>(
        "/api/discount",
        {},
        token
      );

      let list: Discount[] = [];
      if (Array.isArray(result)) {
        list = result;
      } else if (Array.isArray(result.data)) {
        list = result.data;
      }

      setDiscounts(list);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load discounts.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadDiscounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Discounts</h2>
          <p className="text-sm text-muted-foreground">
            Manage discount rules and coupon codes.
          </p>
        </div>
        <Button
          size="sm"
          onClick={() => (window.location.href = "/admin/discounts/new")}
        >
          New discount
        </Button>
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
              <TableHead>Name</TableHead>
              <TableHead className="w-[80px]">Type</TableHead>
              <TableHead className="w-[100px] text-right">Value</TableHead>
              <TableHead className="w-[160px]">Period</TableHead>
              <TableHead className="w-[80px] text-center">Active</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {discounts.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm">
                  No discounts defined.
                </TableCell>
              </TableRow>
            )}

            {discounts.map((d) => {
              // value: string or number
              const valueLabel = (() => {
                const n = Number(d.value as any);
                if (Number.isNaN(n)) {
                  return String(d.value ?? "0");
                }
                // backend type is "percent" for example "10.00"
                if (d.type === "percent") {
                  return `${n}%`;
                }
                return n.toFixed(2);
              })();

              const period =
                (d.start_date || d.end_date) &&
                [d.start_date, d.end_date]
                  .map((x) => (x ? new Date(x).toLocaleDateString() : ""))
                  .join(" → ");

              return (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.id}</TableCell>
                  <TableCell className="text-sm">{d.name}</TableCell>
                  <TableCell className="text-xs">{d.type}</TableCell>
                  <TableCell className="text-right text-sm">
                    {valueLabel}
                  </TableCell>
                  <TableCell className="text-xs">
                    {period || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell className="text-center text-xs">
                    {d.active ? "✓" : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.href = `/admin/discounts/${d.id}`)
                      }
                    >
                      Edit
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            {loading && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm">
                  Loading…
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
