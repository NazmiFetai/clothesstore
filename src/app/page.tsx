"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import type { ProductListResponse, Gender, Product } from "@/lib/types";
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

export default function HomePage() {
  const [search, setSearch] = useState("");
  const [gender, setGender] = useState<GenderFilter>("all");
  const [page, setPage] = useState(1);

  // we keep the type as ProductListResponse | any to not fight TS here
  const [rawData, setRawData] = useState<ProductListResponse | any | null>(
    null
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", "12");
      if (search.trim()) params.set("search", search.trim());
      if (gender !== "all") params.set("gender", gender);

      const result = await apiFetch<ProductListResponse | any>(
        `/api/products?${params.toString()}`
      );

      // If you want to see what the backend actually returns:
      // console.log("DEBUG /api/products response:", result);

      setRawData(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load products.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  function handleApplyFilters() {
    setPage(1);
    void loadProducts();
  }

  // -------- NORMALIZATION LAYER --------
  // Support both:
  // 1) { data: Product[], page, limit, total }
  // 2) Product[] directly
  let products: Product[] = [];
  let currentPage = 1;
  let limit = 12;
  let total = 0;

  if (rawData) {
    if (Array.isArray(rawData)) {
      products = rawData as Product[];
      total = products.length;
      currentPage = 1;
      limit = products.length || 12;
    } else if (Array.isArray(rawData.data)) {
      products = rawData.data as Product[];
      currentPage = rawData.page ?? 1;
      limit = rawData.limit ?? 12;
      total = rawData.total ?? products.length;
    } else {
      // totally unexpected shape – fail gracefully instead of crashing
      products = [];
      total = 0;
    }
  }

  const canPrev = currentPage > 1;
  const totalPages = limit > 0 ? Math.ceil(total / limit) : 1;
  const canNext = currentPage < totalPages;

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Products
          </h1>
          <p className="text-sm text-muted-foreground">
            Browse the catalog. Filters are simple on purpose.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <Input
            placeholder="Search by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />

          <Select
            value={gender}
            onValueChange={(value) => setGender(value as GenderFilter)}
          >
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="All genders" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All genders</SelectItem>
              <SelectItem value="Men">Men</SelectItem>
              <SelectItem value="Women">Women</SelectItem>
              <SelectItem value="Unisex">Unisex</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleApplyFilters}
            disabled={loading}
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
        {loading && products.length === 0 && (
          <p className="text-sm text-muted-foreground">
            Loading products...
          </p>
        )}

        {!loading && products.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No products found. Add some via the admin later.
          </p>
        )}

        {products.length > 0 && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {products.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>

            <div className="mt-4 flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                Page {currentPage} of {totalPages} &middot; {total} total
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
