// src/app/admin/discounts/[id]/page.tsx

"use client";

import {
  useState,
  useEffect,
  type FormEvent,
  type ChangeEvent,
} from "react";
import { useParams, useRouter } from "next/navigation";
import useAuth from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import type { Discount } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

type DiscountTypeOption = "percent" | "fixed";

type DiscountListResponse = { data: Discount[] } | Discount[];

export default function AdminEditDiscountPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id);

  const { token, user } = useAuth();
  const role = (user?.role ?? "") as string;
  const isAdmin = role === "admin" || role === "advanced_user";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [type, setType] = useState<DiscountTypeOption>("percent");
  const [value, setValue] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [active, setActive] = useState(true);
  const [productIds, setProductIds] = useState("");

  if (!isAdmin) {
    return (
      <div className="space-y-4">
        <h2 className="text-lg font-semibold">Edit discount</h2>
        <p className="text-sm text-muted-foreground">
          You do not have permission to view this page.
        </p>
      </div>
    );
  }

  function toDateInputValue(iso?: string | null): string {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return "";
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    } catch {
      return "";
    }
  }

  // LOAD
  useEffect(() => {
    if (!token) return;

    async function load() {
      setLoading(true);
      setFormError(null);
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

        const found = list.find((d) => String(d.id) === id);
        if (!found) {
          setFormError("Discount not found.");
          setLoading(false);
          return;
        }

        setName(found.name ?? "");
        // if backend only uses "percent", keep that; allow selecting "fixed" anyway
        setType((found.type as DiscountTypeOption) ?? "percent");

        const n = Number(found.value as any);
        setValue(Number.isNaN(n) ? String(found.value ?? "") : String(n));

        setStartDate(toDateInputValue(found.start_date ?? null));
        setEndDate(toDateInputValue(found.end_date ?? null));
        setActive(!!found.active);
        setProductIds(""); // backend doesn't send product_ids here
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load discount.";
        setFormError(msg);
      } finally {
        setLoading(false);
      }
    }

    void load();
  }, [id, token]);

  // SAVE
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

    if (startDate) body.start_date = startDate;
    else body.start_date = null;

    if (endDate) body.end_date = endDate;
    else body.end_date = null;

    if (productIds.trim()) {
      const ids = productIds
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((x) => Number(x))
        .filter((n) => !Number.isNaN(n));
      if (ids.length > 0) body.product_ids = ids;
    }

    setSaving(true);
    try {
      await apiFetch<Discount>(
        `/api/discount/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
        token
      );
      router.push("/admin/discounts");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update discount.";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-xl">
        <p className="text-sm text-muted-foreground">Loading discount…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Edit discount</h2>
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
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
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
                disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
            />
          </div>
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
