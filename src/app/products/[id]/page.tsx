// src/app/products/[id]/page.tsx

"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { Product } from "@/lib/types";
import { apiFetch } from "@/lib/api-client";
import useCart from "@/hooks/use-cart";

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
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function ProductPage() {
  const router = useRouter();
  const params = useParams();
  const id = String(params.id); // /products/[id]

  const { addItem } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(
    null
  );
  const [addError, setAddError] = useState<string | null>(null);
  const [addSuccess, setAddSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    async function loadProduct() {
      setLoading(true);
      setError(null);
      setAddError(null);
      setAddSuccess(null);

      try {
        // Primary: detail endpoint
        const result = await apiFetch<any>(`/api/products/${id}`);
        setProduct(result as Product);

        if (Array.isArray(result?.variants) && result.variants.length > 0) {
          const firstVariant = result.variants[0];
          if (firstVariant && firstVariant.id != null) {
            setSelectedVariantId(Number(firstVariant.id));
          }
        }
      } catch (err: unknown) {
        const msg =
          err instanceof Error ? err.message : "Failed to load product.";

        // Fallback: list endpoint and search client-side
        if (msg.includes("400") || msg.includes("404")) {
          try {
            const listResult = await apiFetch<any>(
              "/api/products?page=1&limit=1000"
            );

            let products: any[] = [];
            if (Array.isArray(listResult)) {
              products = listResult;
            } else if (Array.isArray(listResult?.data)) {
              products = listResult.data;
            }

            const found = products.find((p) => String(p.id) === id);

            if (found) {
              setProduct(found as Product);
              if (Array.isArray(found.variants) && found.variants.length > 0) {
                const firstVariant = found.variants[0];
                if (firstVariant && firstVariant.id != null) {
                  setSelectedVariantId(Number(firstVariant.id));
                }
              }
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
      } finally {
        setLoading(false);
      }
    }

    void loadProduct();
  }, [id]);

  // --- Derived variant list & selected variant ---

  const variants: any[] | null = useMemo(() => {
    const v = (product as any)?.variants;
    if (!Array.isArray(v)) return null;
    return v;
  }, [product]);

  const hasVariants = !!variants && variants.length > 0;

  const selectedVariant = useMemo(() => {
    if (!hasVariants || selectedVariantId == null) return null;
    return (
      variants!.find((v) => Number(v.id) === Number(selectedVariantId)) ?? null
    );
  }, [hasVariants, variants, selectedVariantId]);

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
        <h1 className="text-2xl font-bold tracking-tight">Product not found</h1>
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

  // ------- PRICE NORMALIZATION (uses default_price if present) -------

  const rawDefaultPrice =
    (product as any).default_price ?? (product as any).price;
  const rawCurrency = (product as any).currency ?? "";
  let priceLabel = "Price on request";

  if (rawDefaultPrice !== null && rawDefaultPrice !== undefined) {
    const priceNumber = Number(rawDefaultPrice);
    if (!Number.isNaN(priceNumber)) {
      priceLabel = `${priceNumber.toFixed(2)} ${rawCurrency}`.trim();
    }
  }

  const mainImage = product.images?.[0] || "https://picsum.photos/200/300/?blur";

  // ------- ADD TO CART HANDLER -------

  function handleAddToCart() {
    setAddError(null);
    setAddSuccess(null);

    if (!product) {
      setAddError("Product not loaded.");
      return;
    }

    if (!hasVariants) {
      setAddError("This product has no variants defined in the database.");
      return;
    }
    if (!selectedVariant) {
      setAddError("Please select a variant.");
      return;
    }

    const variantId = Number(selectedVariant.id);
    if (!Number.isFinite(variantId)) {
      setAddError("Invalid variant ID.");
      return;
    }

    const priceRaw =
      selectedVariant.price ??
      (product as any).default_price ??
      (product as any).price ??
      0;

    const unitPrice = Number(priceRaw);
    if (!Number.isFinite(unitPrice) || unitPrice <= 0) {
      setAddError("Invalid price for this variant.");
      return;
    }

    const sizeLabel =
      selectedVariant.size_name ?? selectedVariant.size ?? null;
    const colorLabel =
      selectedVariant.color_name ?? selectedVariant.color ?? null;

    const img = product.images?.[0];

    addItem({
      variantId,
      productId: Number((product as any).id) || null,
      name: product.name,
      price: unitPrice,
      quantity: 1,
      sizeLabel: sizeLabel || undefined,
      colorLabel: colorLabel || undefined,
      imageUrl: img,
    });

    const variantTextParts: string[] = [];
    if (sizeLabel) variantTextParts.push(`size ${sizeLabel}`);
    if (colorLabel) variantTextParts.push(colorLabel);
    const variantText = variantTextParts.length
      ? ` (${variantTextParts.join(", ")})`
      : "";

    setAddSuccess(`Added "${product.name}${variantText}" to your cart.`);
  }

  // ------- MAIN UI -------

  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
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
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[120px]">SKU</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead>Color</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Stock</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {variants!.map((variant: any) => {
                      const vId = Number(variant.id);
                      const isSelected =
                        selectedVariantId != null &&
                        Number(selectedVariantId) === vId;

                      const sizeLabel =
                        variant.size_name ?? variant.size ?? "";
                      const colorLabel =
                        variant.color_name ?? variant.color ?? "";

                      const priceRaw =
                        variant.price ??
                        (product as any).default_price ??
                        (product as any).price ??
                        0;
                      const priceNumber = Number(priceRaw);
                      const priceCell = Number.isNaN(priceNumber)
                        ? "—"
                        : priceNumber.toFixed(2);

                      const stockRaw =
                        variant.current_quantity ??
                        variant.initial_quantity ??
                        variant.stock ??
                        null;
                      const stockCell =
                        stockRaw === null || stockRaw === undefined
                          ? "—"
                          : String(stockRaw);

                      return (
                        <TableRow
                          key={variant.id ?? variant.sku ?? Math.random()}
                          className={
                            "cursor-pointer " +
                            (isSelected ? "bg-muted/60" : "")
                          }
                          onClick={() => {
                            if (variant.id != null) {
                              setSelectedVariantId(Number(variant.id));
                              setAddError(null);
                              setAddSuccess(null);
                            }
                          }}
                        >
                          <TableCell className="font-mono text-xs">
                            {variant.sku ?? `#${variant.id ?? "?"}`}
                          </TableCell>
                          <TableCell>{sizeLabel || "—"}</TableCell>
                          <TableCell>{colorLabel || "—"}</TableCell>
                          <TableCell className="text-right">
                            {priceCell}
                          </TableCell>
                          <TableCell className="text-right">
                            {stockCell}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">
              No variant data available for this product. You won&apos;t be able
              to add it to the cart until variants are defined in the database.
            </p>
          )}

          {addError && (
            <Alert variant="destructive">
              <AlertDescription>{addError}</AlertDescription>
            </Alert>
          )}

          {addSuccess && (
            <Alert className="border-emerald-500/40 bg-emerald-500/5 text-emerald-800">
              <AlertDescription>{addSuccess}</AlertDescription>
            </Alert>
          )}

          <div className="pt-4 flex flex-col sm:flex-row gap-2">
            <Button
              className="w-full sm:w-auto"
              onClick={handleAddToCart}
              disabled={!hasVariants || !selectedVariant}
            >
              Add to cart
            </Button>
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => router.push("/cart")}
            >
              Go to cart
            </Button>
            <Button
              variant="ghost"
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
