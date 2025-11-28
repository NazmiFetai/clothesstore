// src/app/admin/products/[id]/page.tsx

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

type AdminProductVariant = {
  id: number;
  size_id: number | null;
  color_id: number | null;
  sku: string | null;
  price: string | number;
  initial_quantity: number;
};

type AdminProduct = {
  id: number | string;
  name: string;
  description: string | null;
  category_id: number | string | null;
  brand_id: number | string | null;
  gender_id: number | string | null;
  default_price: number | string | null;
  active?: boolean;
  created_at?: string;
  updated_at?: string;
  variants?: AdminProductVariant[] | null;
};

type SizeRow = { id: number; name: string };
type ColorRow = { id: number; name: string };

type EditableVariant = {
  id?: number;
  tempId: string;
  sizeId: string;
  colorId: string;
  sku: string;
  price: string;
  initialQuantity: string;
  deleted?: boolean;
};

export default function AdminEditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const { token, user } = useAuth();
  const role = (user?.role ?? "") as string;
  const isAdmin = role === "admin" || role === "advanced_user";

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [genderId, setGenderId] = useState("");

  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [colors, setColors] = useState<ColorRow[]>([]);
  const [variants, setVariants] = useState<EditableVariant[]>([]);
  const [lookupsLoading, setLookupsLoading] = useState(false);

  // --------- Load lookups + product ----------
  useEffect(() => {
    if (!id) return;

    async function loadAll() {
      setLoading(true);
      setFormError(null);

      try {
        setLookupsLoading(true);
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

      try {
        const p = await apiFetch<AdminProduct>(`/api/products/${id}`);

        setName(p.name ?? "");
        setDescription(p.description ?? "");

        const dp =
          p.default_price !== null && p.default_price !== undefined
            ? Number(p.default_price)
            : NaN;
        setDefaultPrice(Number.isNaN(dp) ? "" : String(dp));

        setCategoryId(
          p.category_id !== null && p.category_id !== undefined
            ? String(p.category_id)
            : ""
        );
        setBrandId(
          p.brand_id !== null && p.brand_id !== undefined
            ? String(p.brand_id)
            : ""
        );
        setGenderId(
          p.gender_id !== null && p.gender_id !== undefined
            ? String(p.gender_id)
            : ""
        );

        const defaultPriceFromProduct =
  p.default_price !== null && p.default_price !== undefined
    ? String(p.default_price)
    : "";

const vList: EditableVariant[] = (p.variants ?? []).map((v) => ({
  id: v.id,
  tempId: `${v.id}`,
  sizeId: v.size_id != null ? String(v.size_id) : "",
  colorId: v.color_id != null ? String(v.color_id) : "",
  sku: v.sku ?? "",
  price:
    v.price !== null && v.price !== undefined
      ? String(v.price)
      : defaultPriceFromProduct,
  initialQuantity: String(v.initial_quantity ?? 0),
}));

setDefaultPrice(defaultPriceFromProduct);
setVariants(vList);

        setVariants(vList);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load product.";
        setFormError(msg);
      } finally {
        setLoading(false);
      }
    }

    void loadAll();
  }, [id]);

  // --------- Variant helpers ----------
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

  function markRemoveVariant(tempId: string) {
    setVariants((prev) =>
      prev.map((v) =>
        v.tempId === tempId ? { ...v, deleted: true } : v
      )
    );
  }

  function restoreVariant(tempId: string) {
    setVariants((prev) =>
      prev.map((v) =>
        v.tempId === tempId ? { ...v, deleted: false } : v
      )
    );
  }

  function removeNewVariantPermanent(tempId: string) {
    setVariants((prev) => prev.filter((v) => v.tempId !== tempId));
  }

  // --------- SAVE ----------
  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError(null);

    if (!isAdmin || !token) {
      setFormError("You are not allowed to edit products.");
      return;
    }

    if (!name || !defaultPrice) {
      setFormError("Name and default price are required.");
      return;
    }

    const default_price = Number(defaultPrice);
    if (Number.isNaN(default_price) || default_price <= 0) {
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

    const variantPayload = variants
      .map((v) => {
        // Hard-delete new ones with deleted flag
        if (!v.id && v.deleted) return null;

        const price = v.price ? Number(v.price) : default_price;
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

        if (!v.deleted) {
          if (size_id === null || Number.isNaN(size_id)) {
            setFormError("Each active variant must have a valid size.");
            return null;
          }
          if (color_id === null || Number.isNaN(color_id)) {
            setFormError("Each active variant must have a valid color.");
            return null;
          }
        }

        return {
          id: v.id ?? undefined,
          size_id,
          color_id,
          sku: v.sku || null,
          price,
          initial_quantity: qty,
          _delete: !!v.deleted,
        };
      })
      .filter(Boolean);

    if (variantPayload.includes(null as any)) {
      // Validation already set an error
      return;
    }

    const body = {
      id,
      name,
      description: description || null,
      default_price,
      category_id,
      brand_id,
      gender_id,
      variants: variantPayload,
    };

    setSaving(true);
    try {
      await apiFetch<AdminProduct>(
        `/api/products/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(body),
        },
        token
      );
      router.push("/admin/products");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to update product.";
      setFormError(msg);
    } finally {
      setSaving(false);
    }
  }

  // --------- DELETE ----------
  async function handleDelete() {
    if (!isAdmin || !token) {
      setFormError("You are not allowed to delete products.");
      return;
    }

    setDeleting(true);
    setFormError(null);

    try {
      await apiFetch<{ message: string }>(
        `/api/products/${id}`,
        { method: "DELETE" },
        token
      );
      router.push("/admin/products");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to delete product.";
      setFormError(msg);
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4 max-w-3xl">
        <p className="text-sm text-muted-foreground">Loading product…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Edit product #{id}</h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/admin/products")}
          >
            Back to products
          </Button>
          <Button
            variant="destructive"
            size="sm"
            disabled={deleting || !isAdmin}
            onClick={handleDelete}
          >
            {deleting ? "Deleting…" : "Delete"}
          </Button>
        </div>
      </div>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Base fields */}
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

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e: ChangeEvent<HTMLTextAreaElement>) =>
                setDescription(e.target.value)
              }
              rows={3}
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
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
              disabled={saving}
            />
          </div>
        </div>

        {/* Variant editor */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Variants</h3>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={addVariant}
              disabled={saving || lookupsLoading}
            >
              Add variant
            </Button>
          </div>

          {variants.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No variants defined yet. Click &quot;Add variant&quot; to create
              one.
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
                  {variants.map((v) => {
                    const isNew = !v.id;
                    const isDeleted = !!v.deleted;

                    if (isNew && isDeleted) {
                      // Hard hide new+deleted
                      return null;
                    }

                    return (
                      <TableRow
                        key={v.tempId}
                        className={isDeleted ? "opacity-50" : ""}
                      >
                        <TableCell>
                          <select
                            className="border rounded-md px-2 py-1 text-xs bg-background w-full"
                            value={v.sizeId}
                            onChange={(e) =>
                              updateVariant(v.tempId, "sizeId", e.target.value)
                            }
                            disabled={saving || isDeleted}
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
                              updateVariant(
                                v.tempId,
                                "colorId",
                                e.target.value
                              )
                            }
                            disabled={saving || isDeleted}
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
                            disabled={saving || isDeleted}
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
                            disabled={saving || isDeleted}
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
                            disabled={saving || isDeleted}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {isDeleted ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() => restoreVariant(v.tempId)}
                              disabled={saving}
                            >
                              Undo
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-xs"
                              onClick={() =>
                                v.id
                                  ? markRemoveVariant(v.tempId)
                                  : removeNewVariantPermanent(v.tempId)
                              }
                              disabled={saving}
                            >
                              Remove
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>

        <Button type="submit" disabled={saving || !isAdmin}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
