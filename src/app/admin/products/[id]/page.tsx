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

// Match what /api/products/:id actually returns
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
  deleted_at?: string | null;
  variants?: unknown[] | null;
};

export default function AdminEditProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id); // numeric for PUT / DB

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

  // --------- LOAD PRODUCT ----------
  useEffect(() => {
    if (!id) return;

    async function loadProduct() {
      setLoading(true);
      setFormError(null);

      try {
        // use the real detail endpoint
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
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load product.";
        setFormError(msg);
      } finally {
        setLoading(false);
      }
    }

    void loadProduct();
  }, [id]);

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

    const body = {
      id,
      name,
      description: description || null,
      default_price,
      category_id,
      brand_id,
      gender_id,
    };

    setSaving(true);
    try {
      await apiFetch<AdminProduct>(
        "/api/products",
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
        `/api/products?id=${id}`,
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
      <div className="space-y-4 max-w-2xl">
        <p className="text-sm text-muted-foreground">Loading product…</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 max-w-2xl">
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

        <Button type="submit" disabled={saving || !isAdmin}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      </form>
    </div>
  );
}
