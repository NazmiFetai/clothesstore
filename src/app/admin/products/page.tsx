// src/app/admin/products/page.tsx

"use client";

import { useEffect, useState } from "react";
import { apiFetch } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

// Match your backend shape (products p.* + variants json_agg)
type AdminProduct = {
  id: number;
  name: string;
  description: string | null;
  default_price: number | null;
  category_id: number | null;
  brand_id: number | null;
  gender_id: number | null;
  variants?: unknown[] | null;
};

export default function AdminProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadProducts(targetPage: number) {
    setLoading(true);
    setError(null);
    try {
      const offset = (targetPage - 1) * limit;

      const result = await apiFetch<AdminProduct[]>(
        `/api/products?limit=${limit}&offset=${offset}`
      );

      const list = Array.isArray(result) ? result : [];

      // crude total estimate: offset + current page size
      const totalCount = offset + list.length;

      setProducts(list);
      setPage(targetPage);
      setTotal(totalCount);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load products.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadProducts(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalPages = limit > 0 ? Math.max(1, Math.ceil(total / limit)) : 1;
  const canPrev = page > 1;
  const canNext = products.length === limit; // only allow next if we got a full page

  return (
    <div className="space-y-4">
      {/* HEADER + ADD BUTTON */}
      <div className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-semibold">Products</h2>
          <p className="text-sm text-muted-foreground">
            Manage the products in the catalog.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => (window.location.href = "/admin/products/new")}
        >
          Add product
        </Button>
      </div>

      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="rounded-md border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[60px]">ID</TableHead>
              <TableHead>Name</TableHead>
              <TableHead className="w-[80px]">Gender ID</TableHead>
              <TableHead className="w-[120px]">Default price</TableHead>
              <TableHead className="w-[100px] text-right">Variants</TableHead>
              <TableHead className="w-[120px] text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 && !loading && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm">
                  No products found.
                </TableCell>
              </TableRow>
            )}

            {products.map((product) => {
              const priceValue =
                product.default_price !== null &&
                product.default_price !== undefined
                  ? Number(product.default_price)
                  : null;

              const priceLabel =
                priceValue !== null && !Number.isNaN(priceValue)
                  ? priceValue.toFixed(2)
                  : "–";

              const variantCount = Array.isArray(product.variants)
                ? product.variants.length
                : 0;

              return (
                <TableRow key={product.id}>
                  <TableCell className="font-mono text-xs">
                    {product.id}
                  </TableCell>
                  <TableCell className="text-sm">{product.name}</TableCell>
                  <TableCell className="text-xs">
                    {product.gender_id ?? "–"}
                  </TableCell>
                  <TableCell className="text-sm">{priceLabel}</TableCell>
                  <TableCell className="text-right text-xs">
                    {variantCount}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        (window.location.href = `/admin/products/${product.id}`)
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
          Page {page} of {totalPages} · {total} total (approx.)
        </span>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={!canPrev || loading}
            onClick={() => canPrev && void loadProducts(page - 1)}
          >
            Previous
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!canNext || loading}
            onClick={() => canNext && void loadProducts(page + 1)}
          >
            Next
          </Button>
        </div>
      </div>
    </div>
  );
}
