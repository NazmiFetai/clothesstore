// src/app/admin/products/new/page.tsx

"use client";

import {
  useState,
  type FormEvent,
  type ChangeEvent,
  useEffect,
} from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/use-auth";
import { apiFetch } from "@/lib/api-client";
import type { Product } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from "@/components/ui/table";

type SizeRow = { id: number; name: string };
type ColorRow = { id: number; name: string };

type EditableVariant = {
  tempId: string;
  sizeId: string; // size_id from DB as string
  colorId: string; // color_id from DB as string
  sku: string;
  price: string;
  initialQuantity: string;
};

export default function AdminNewProductPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [genderId, setGenderId] = useState("");

  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [colors, setColors] = useState<ColorRow[]>([]);

  const [variants, setVariants] = useState<EditableVariant[]>([]);

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  const role = (user?.role ?? "") as string;
  const isAdmin = role === "admin" || role === "advanced_user";

  // ---------- Load sizes & colors ----------
  useEffect(() => {
    async function loadLookups() {
      setLookupsLoading(true);
      try {
        const [sz, col] = await Promise.all([
          apiFetch<SizeRow[]>("/api/sizes"),
          apiFetch<ColorRow[]>("/api/colors"),
        ]);
        setSizes(sz ?? []);
        setColors(col ?? []);
      } catch (err) {
        console.error("Failed to load sizes/colors:", err);
      } finally {
        setLookupsLoading(false);
      }
    }

    void loadLookups();
  }, []);

  // ---------- Variant helpers ----------
  function addVariant() {
    if (!sizes.length || !colors.length) {
      setFormError("You must define sizes and colors in the database first.");
      return;
    }

    const firstSize = String(sizes[0].id);
    const firstColor = String(colors[0].id);

    setVariants((prev) => [
      ...prev,
      {
        tempId: crypto.randomUUID(),
        sizeId: firstSize,
        colorId: firstColor,
        sku: "",
        price: defaultPrice || "",
        initialQuantity: "0",
      },
    ]);
  }

  function updateVariant(
    tempId: string,
    field: keyof EditableVariant,
    value: string
  ) {
    setVariants((prev) =>
      prev.map((v) => (v.tempId === tempId ? { ...v, [field]: value } : v))
    );
  }

  function removeVariant(tempId: string) {
    setVariants((prev) => prev.filter((v) => v.tempId !== tempId));
  }

  // ---------- Submit ----------
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!isAdmin || !token) {
      setFormError("You are not allowed to create products.");
      return;
    }

    if (!name || !defaultPrice) {
      setFormError("Name and default price are required.");
      return;
    }

    const priceNumber = Number(defaultPrice);
    if (Number.isNaN(priceNumber) || priceNumber <= 0) {
      setFormError("Default price must be a valid positive number.");
      return;
    }

    const category_id = categoryId ? Number(categoryId) : null;
    const brand_id = brandId ? Number(brandId) : null;
    const gender_id = genderId ? Number(genderId) : null;

    if (categoryId && (category_id === null || Number.isNaN(category_id))) {
      setFormError("Category ID must be a number.");
      return;
    }
    if (brandId && (brand_id === null || Number.isNaN(brand_id))) {
      setFormError("Brand ID must be a number.");
      return;
    }
    if (genderId && (gender_id === null || Number.isNaN(gender_id))) {
      setFormError("Gender ID must be a number.");
      return;
    }

    // Build variants payload
    const variantPayload = variants
      .map((v) => {
        const price = v.price ? Number(v.price) : priceNumber;
        const qty = v.initialQuantity ? Number(v.initialQuantity) : 0;

        if (Number.isNaN(price) || price < 0) {
          setFormError("Variant price must be a valid number.");
          return null;
        }
        if (Number.isNaN(qty) || qty < 0) {
          setFormError("Variant initial quantity must be a valid number.");
          return null;
        }

        const size_id = v.sizeId ? Number(v.sizeId) : null;
        const color_id = v.colorId ? Number(v.colorId) : null;

        if (size_id === null || Number.isNaN(size_id)) {
          setFormError("Each variant must have a valid size.");
          return null;
        }
        if (color_id === null || Number.isNaN(color_id)) {
          setFormError("Each variant must have a valid color.");
          return null;
        }

        return {
          size_id,
          color_id,
          sku: v.sku || null,
          price,
          initial_quantity: qty,
        };
      })
      .filter(Boolean);

    if (variantPayload.includes(null as any)) {
      // Some variant failed validation, error already set
      return;
    }

    const body = {
      name,
      description: description || null,
      default_price: priceNumber,
      category_id,
      brand_id,
      gender_id,
      variants: variantPayload,
    };

    setSubmitting(true);
    try {
      await apiFetch<Product>(
        "/api/products",
        {
          method: "POST",
          body: JSON.stringify(body),
        },
        token
      );
      router.push("/admin/products");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to create product.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">New product</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push("/admin/products")}
        >
          Back to products
        </Button>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic fields */}
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

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              rows={3}
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="defaultPrice">Default price</Label>
            <Input
              id="defaultPrice"
              type="number"
              step="0.01"
              min="0"
              value={defaultPrice}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setDefaultPrice(e.target.value)
              }
              required
              disabled={submitting}
            />
          </div>

          <div />

          <div className="space-y-2">
            <Label htmlFor="categoryId">Category ID (optional)</Label>
            <Input
              id="categoryId"
              value={categoryId}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setCategoryId(e.target.value)
              }
              placeholder="e.g. 1"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="brandId">Brand ID (optional)</Label>
            <Input
              id="brandId"
              value={brandId}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setBrandId(e.target.value)
              }
              placeholder="e.g. 2"
              disabled={submitting}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="genderId">Gender ID (optional)</Label>
            <Input
              id="genderId"
              value={genderId}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setGenderId(e.target.value)
              }
              placeholder="e.g. 1"
              disabled={submitting}
            />
          </div>
        </div>

        {/* Variants editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Variants</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVariant}
              disabled={submitting || lookupsLoading}
            >
              Add variant
            </Button>
          </div>

          {variants.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No variants yet. Click &quot;Add variant&quot; to define size,
              color, price, and initial stock.
            </p>
          ) : (
            <div className="rounded-md border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Size</TableHead>
                    <TableHead>Color</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">
                      Initial quantity
                    </TableHead>
                    <TableHead className="w-[80px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variants.map((v) => (
                    <TableRow key={v.tempId}>
                      <TableCell>
                        <select
                          className="border rounded-md px-2 py-1 text-xs bg-background w-full"
                          value={v.sizeId}
                          onChange={(e) =>
                            updateVariant(v.tempId, "sizeId", e.target.value)
                          }
                          disabled={submitting}
                        >
                          {sizes.map((s) => (
                            <option key={s.id} value={s.id}>
                              {s.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <select
                          className="border rounded-md px-2 py-1 text-xs bg-background w-full"
                          value={v.colorId}
                          onChange={(e) =>
                            updateVariant(v.tempId, "colorId", e.target.value)
                          }
                          disabled={submitting}
                        >
                          {colors.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={v.sku}
                          onChange={(e) =>
                            updateVariant(v.tempId, "sku", e.target.value)
                          }
                          className="text-xs"
                          disabled={submitting}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={v.price}
                          onChange={(e) =>
                            updateVariant(v.tempId, "price", e.target.value)
                          }
                          className="text-xs"
                          disabled={submitting}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          min="0"
                          value={v.initialQuantity}
                          onChange={(e) =>
                            updateVariant(
                              v.tempId,
                              "initialQuantity",
                              e.target.value
                            )
                          }
                          className="text-xs"
                          disabled={submitting}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="text-xs"
                          onClick={() => removeVariant(v.tempId)}
                          disabled={submitting}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Button type="submit" disabled={submitting || !isAdmin}>
          {submitting ? "Creating..." : "Create product"}
        </Button>
      </form>
    </div>
  );
}
