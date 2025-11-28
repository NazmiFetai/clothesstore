// src/app/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { Gender, Product } from "@/lib/types";
import { ProductCard } from "@/components/shop/product-card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";

type GenderFilter = Gender | "all";

const PAGE_SIZE = 12;

// Shape returned by /api/products/search
type SearchRow = {
  product_id: number;
  product_name: string;
  variant_id: number;
  sku: string | null;
  price: string | number;
  initial_quantity: number;
  sold_quantity: number;
  current_quantity: number;
  category: string | null;
  brand: string | null;
  gender: string | null;
  size: string | null;
  color: string | null;
};

// Lookup types for filters (names are what matter for the search API)
type CategoryRow = { id: number; name: string; description?: string | null };
type BrandRow = { id: number; name: string; description?: string | null };
type SizeRow = { id: number; name: string };
type ColorRow = { id: number; name: string };

export default function HomePage() {
  // UI filters
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<GenderFilter>("all");
  const [category, setCategory] = useState<string>("all");
  const [brand, setBrand] = useState<string>("all");
  const [size, setSize] = useState<string>("all");
  const [color, setColor] = useState<string>("all");
  const [priceMin, setPriceMin] = useState<string>("");
  const [priceMax, setPriceMax] = useState<string>("");
  const [onlyAvailable, setOnlyAvailable] = useState<boolean>(false);

  const [page, setPage] = useState(1);

  const [rows, setRows] = useState<SearchRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lookup lists
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [brands, setBrands] = useState<BrandRow[]>([]);
  const [sizes, setSizes] = useState<SizeRow[]>([]);
  const [colors, setColors] = useState<ColorRow[]>([]);

  const [filtersLoading, setFiltersLoading] = useState(false);

  // ---------------- LOAD FILTER DATA ----------------

  async function loadFilterData() {
    setFiltersLoading(true);
    try {
      const [cats, brs, szs, cols] = await Promise.all([
        apiFetch<CategoryRow[]>("/api/categories"),
        apiFetch<BrandRow[]>("/api/brands"),
        apiFetch<SizeRow[]>("/api/sizes"),
        apiFetch<ColorRow[]>("/api/colors"),
      ]);

      setCategories(cats || []);
      setBrands(brs || []);
      setSizes(szs || []);
      setColors(cols || []);
    } catch (err) {
      // If this fails, we just show empty lists and move on.
      console.error("Failed to load filter lists:", err);
    } finally {
      setFiltersLoading(false);
    }
  }

  // ---------------- LOAD PRODUCTS FROM /api/products/search ----------------

  async function loadProducts() {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();

      if (search.trim()) params.set("search", search.trim());
      if (gender !== "all") params.set("gender", gender);
      if (category !== "all") params.set("category", category);
      if (brand !== "all") params.set("brand", brand);
      if (size !== "all") params.set("size", size);
      if (color !== "all") params.set("color", color);

      if (priceMin.trim()) params.set("price_min", priceMin.trim());
      if (priceMax.trim()) params.set("price_max", priceMax.trim());

      if (onlyAvailable) params.set("available", "true");

      const result = await apiFetch<SearchRow[]>(
        `/api/products/search?${params.toString()}`
      );

      setRows(result || []);
      setPage(1);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load products.";
      setError(msg);
      setRows([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadFilterData();
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleApplyFilters() {
    void loadProducts();
  }

  // ---------------- NORMALIZE: variant rows -> Product[] ----------------

  const products: Product[] = useMemo(() => {
    const map = new Map<string, Product>();

    for (const row of rows) {
      const productId = String(row.product_id);
      const existing = map.get(productId);

      const priceNum = Number(row.price);
      const safePrice = Number.isNaN(priceNum) ? 0 : priceNum;

      const genderLabel = (row.gender as any) ?? "Unisex";

      const variant = {
        sku: row.sku ?? String(row.variant_id),
        size: (row.size ?? "M") as any, // cast because your Product type uses specific literals
        color: row.color ?? "Black",
        stock: Number(row.current_quantity ?? 0) || 0,
      };

      if (!existing) {
        const product: Product = {
          id: productId,
          name: row.product_name,
          description: undefined,
          price: safePrice,
          currency: "CHF", // adjust if needed
          categoryId: "", // only category name available, no id in this query
          gender: genderLabel as Gender,
          images: ["https://picsum.photos/200/300/?blur"],
          variants: [variant],
        };
        map.set(productId, product);
      } else {
        existing.variants.push(variant);
        // Optionally adjust price (e.g. smallest variant price)
        if (safePrice > 0 && safePrice < existing.price) {
          existing.price = safePrice;
        }
      }
    }

    return Array.from(map.values());
  }, [rows]);

  // ---------------- CLIENT-SIDE PAGINATION ----------------

  const total = products.length;
  const totalPages = total === 0 ? 1 : Math.ceil(total / PAGE_SIZE);

  const canPrev = page > 1;
  const canNext = page < totalPages;

  const pagedProducts = products.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  // ---------------- RENDER ----------------

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Browse the catalog and use filters to narrow down.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row flex-wrap gap-2 sm:items-center">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />

          {/* Gender filter */}
          <Select
            value={gender}
            onValueChange={(value) => setGender(value as GenderFilter)}
          >
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Gender" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="Men">Men</SelectItem>
              <SelectItem value="Women">Women</SelectItem>
              <SelectItem value="Unisex">Unisex</SelectItem>
            </SelectContent>
          </Select>

          {/* Category filter */}
          <Select
            value={category}
            onValueChange={(value) => setCategory(value)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Brand filter */}
          <Select value={brand} onValueChange={(value) => setBrand(value)}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Brand" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All brands</SelectItem>
              {brands.map((b) => (
                <SelectItem key={b.id} value={b.name}>
                  {b.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Size filter */}
          <Select value={size} onValueChange={(value) => setSize(value)}>
            <SelectTrigger className="w-full sm:w-28">
              <SelectValue placeholder="Size" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All sizes</SelectItem>
              {sizes.map((s) => (
                <SelectItem key={s.id} value={s.name}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Color filter */}
          <Select value={color} onValueChange={(value) => setColor(value)}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="Color" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All colors</SelectItem>
              {colors.map((c) => (
                <SelectItem key={c.id} value={c.name}>
                  {c.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex gap-1">
            <Input
              placeholder="Min"
              value={priceMin}
              onChange={(e) => setPriceMin(e.target.value)}
              className="w-20"
            />
            <Input
              placeholder="Max"
              value={priceMax}
              onChange={(e) => setPriceMax(e.target.value)}
              className="w-20"
            />
          </div>

          <label className="flex items-center gap-2 text-xs sm:text-sm">
            <input
              type="checkbox"
              checked={onlyAvailable}
              onChange={(e) => setOnlyAvailable(e.target.checked)}
            />
            In stock only
          </label>

          <Button
            variant="outline"
            onClick={handleApplyFilters}
            disabled={loading || filtersLoading}
          >
            {loading ? "Loading..." : "Apply"}
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div>
        {loading && pagedProducts.length === 0 && (
          <p className="text-sm text-muted-foreground">Loading products...</p>
        )}

        {!loading && pagedProducts.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No products found with these filters.
          </p>
        )}

        {pagedProducts.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {pagedProducts.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {page} of {totalPages} · {total} products
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canPrev || loading}
                  onClick={() => canPrev && setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!canNext || loading}
                  onClick={() => canNext && setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
