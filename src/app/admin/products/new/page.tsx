// src/app/admin/products/new/page.tsx

"use client";

import { useState, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/use-auth"; // <- default import
import { apiFetch } from "@/lib/api-client";
import type { Product } from "@/lib/types";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AdminNewProductPage() {
  const router = useRouter();
  const { token, user } = useAuth();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [defaultPrice, setDefaultPrice] = useState("");

  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [genderId, setGenderId] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // widen role to string so TS stops whining about literal union mismatch
  const role = (user?.role ?? "") as string;
  const isAdmin = role === "admin" || role === "advanced_user";

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

    // 🔥 This matches your backend exactly:
    // name, default_price, description, category_id, brand_id, gender_id
    const body = {
      name,
      description: description || null,
      default_price: priceNumber,
      category_id,
      brand_id,
      gender_id,
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
      //console.log(body)

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
    <div className="space-y-4 max-w-2xl">
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

        <Button type="submit" disabled={submitting || !isAdmin}>
          {submitting ? "Creating..." : "Create product"}
        </Button>
      </form>
    </div>
  );
}
