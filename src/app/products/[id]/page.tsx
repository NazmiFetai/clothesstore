// src/app/products/[id]/page.tsx

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { apiFetch } from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export default function ProductPage() {
  const router = useRouter();
  const params = useParams(); // ✅ client-side way
  const id = String(params.id); // id from route, e.g. /products/123

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadProduct() {
      setLoading(true);
      setError(null);

      try {
        // 1) try the proper detail endpoint
        const result = await apiFetch<Product>(`/api/products/${id}`);
        setProduct(result);
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load product.";

        // If the detail endpoint is misbehaving (400/404),
        // fall back to fetching the list and searching client-side.
        if (msg.includes("400") || msg.includes("404")) {
          try {
            const listResult = await apiFetch<any>(
              "/api/products?page=1&limit=1000"
            );

            let products: any[] = [];
            if (Array.isArray(listResult)) {
              products = listResult;
            } else if (Array.isArray(listResult.data)) {
              products = listResult.data;
            }

            const found = products.find(
              (p) => String((p as any).id) === id
            );

            if (found) {
              setProduct(found as Product);
            } else {
              setError("NOT_FOUND");
            }
          } catch (err2: unknown) {
            const msg2 =
              err2 instanceof Error
                ? err2.message
                : "Failed to load product from list.";
            setError(msg2);
          }
        } else {
          setError(msg);
        }
      }

      setLoading(false);
    }

    void loadProduct();
  }, [id]);

  // ------- LOADING / ERROR STATES -------

  if (loading && !product) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        <p className="text-sm text-muted-foreground">Loading product...</p>
      </div>
    );
  }

  if (error === "NOT_FOUND") {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Product not found
        </h1>
        <p className="text-sm text-muted-foreground">
          The product you are looking for does not exist or has been removed.
        </p>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to store
        </Button>
      </div>
    );
  }

  if (error && !product) {
    return (
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
        <h1 className="text-2xl font-bold tracking-tight">
          Error loading product
        </h1>
        <p className="text-sm text-destructive">{error}</p>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to store
        </Button>
      </div>
    );
  }

  if (!product) {
    return null;
  }

  // ------- PRICE NORMALIZATION -------

  const rawPrice = (product as any).price;
  const rawCurrency = (product as any).currency ?? "";
  let priceLabel = "Price on request";
  if (rawPrice !== null && rawPrice !== undefined) {
    const priceNumber = Number(rawPrice);
    if (!Number.isNaN(priceNumber)) {
      priceLabel = `${priceNumber.toFixed(2)} ${rawCurrency}`.trim();
    }
  }

  const mainImage = product.images?.[0];
  const hasVariants =
    Array.isArray(product.variants) && product.variants.length > 0;

  // ------- MAIN UI -------

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
      <div className="grid gap-8 lg:grid-cols-2">
        {/* LEFT: IMAGE / GALLERY */}
        <div className="space-y-4">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              {mainImage ? (
                <div className="aspect-[4/5] w-full bg-muted">
                  <img
                    src={mainImage}
                    alt={product.name}
                    className="h-full w-full object-cover"
                  />
                </div>
              ) : (
                <div className="aspect-[4/5] w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                  No image
                </div>
              )}
            </CardContent>
          </Card>

          {product.images && product.images.length > 1 && (
            <div className="grid grid-cols-4 gap-2">
              {product.images.slice(1, 5).map((img, idx) => (
                <div
                  key={img + idx}
                  className="aspect-square overflow-hidden rounded-md bg-muted"
                >
                  <img
                    src={img}
                    alt={`${product.name} ${idx + 2}`}
                    className="h-full w-full object-cover"
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT: DETAILS */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {product.name}
              </h1>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                {product.gender && (
                  <Badge variant="outline">{product.gender}</Badge>
                )}
                <span className="font-semibold text-foreground">
                  {priceLabel}
                </span>
              </div>
            </div>
          </div>

          {product.description && (
            <p className="text-sm leading-relaxed text-muted-foreground">
              {product.description}
            </p>
          )}

          {hasVariants ? (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold">Available variants</h2>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">SKU</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {product.variants.map((variant: any) => (
                      <TableRow key={variant.sku}>
                        <TableCell className="font-mono text-xs">
                          {variant.sku}
                        </TableCell>
                        <TableCell>{variant.size}</TableCell>
                        <TableCell>{variant.color}</TableCell>
                        <TableCell className="text-right">
                          {variant.stock}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No variant data available for this product.
            </p>
          )}

          <div className="pt-4 flex gap-2">
            <Button className="w-full sm:w-auto" disabled>
              Add to cart (coming soon)
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => router.push("/")}
            >
              Back to store
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
