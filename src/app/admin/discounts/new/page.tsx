// src/app/admin/discounts/new/page.tsx

"use client";

import {
  useState,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import type { Discount } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type DiscountTypeOption = "percent" | "fixed";

export default function AdminNewDiscountPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const role = (user?.role ?? "") as string;
  const isAdmin = role === "admin" || role === "advanced_user";

  const [name, setName] = useState("");
  const [type, setType] = useState<DiscountTypeOption>("percent");
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [active, setActive] = useState(true);
  const [productIds, setProductIds] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">New discount</h2>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!name || !value) {
      setFormError("Name and value are required.");
      return;
    }

    const numericValue = Number(value);
    if (Number.isNaN(numericValue) || numericValue <= 0) {
      setFormError("Value must be a positive number.");
      return;
    }

    const body: any = {
      name,
      type,
      value: numericValue,
      active,
    };

    // backend example shows "start_date" as just "YYYY-MM-DD"
    if (startDate) body.start_date = startDate;
    if (endDate) body.end_date = endDate;

    if (productIds.trim()) {
      const ids = productIds
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => Number(x))
        .filter((n) => !Number.isNaN(n));
      if (ids.length > 0) {
        body.product_ids = ids;
      }
    }

    setSubmitting(true);
    try {
      await apiFetch<Discount>(
        "/api/discount",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
        token
      );
      router.push("/admin/discounts");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create discount.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">New discount</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/discounts")}
        >
          Back to discounts
        </Button>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setName(e.target.value)
              }
              required
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              className="border rounded-md px-2 py-2 text-sm bg-background"
              value={type}
              onChange={(e) =>
                setType(e.target.value as DiscountTypeOption)
              }
              disabled={submitting}
            >
              <option value="percent">percent</option>
              <option value="fixed">fixed</option>
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min="0"
              value={value}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setValue(e.target.value)
              }
              required
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              For &quot;percent&quot;, 10 = 10%. For &quot;fixed&quot;, 10 =
              10.00 currency units.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="active">Active</Label>
            <div className="flex items-center gap-2">
              <input
                id="active"
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-4 w-4"
                disabled={submitting}
              />
              <span className="text-sm">Is active</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="startDate">Start date</Label>
            <Input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setStartDate(e.target.value)
              }
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="endDate">End date</Label>
            <Input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setEndDate(e.target.value)
              }
              disabled={submitting}
            />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="productIds">Product IDs (optional)</Label>
            <Input
              id="productIds"
              value={productIds}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setProductIds(e.target.value)
              }
              placeholder="e.g. 1,2,3"
              disabled={submitting}
            />
            <p className="text-xs text-muted-foreground">
              Comma-separated list of product IDs the discount applies to.
            </p>
          </div>
        </div>

        <Button type="submit" disabled={submitting}>
          {submitting ? "Creating…" : "Create discount"}
        </Button>
      </form>
    </div>
  );
}
