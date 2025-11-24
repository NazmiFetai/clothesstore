// src/components/shop/product-card.tsx

"use client";

import Link from "next/link";
import { Product } from "@/lib/types";
import {
  Card,
  CardHeader,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const image = product.images?.[0];

  // ---- PRICE NORMALIZATION ----
  // Your backend is clearly not giving a clean number here, so we normalize.
  const rawPrice = (product as any).price;
  const rawCurrency = (product as any).currency ?? "";

  let priceLabel = "Price on request";
  if (rawPrice !== null && rawPrice !== undefined) {
    const priceNumber = Number(rawPrice);
    if (!Number.isNaN(priceNumber)) {
      priceLabel = `${priceNumber.toFixed(2)} ${rawCurrency}`.trim();
    }
  }

  return (
    <Card className="flex flex-col overflow-hidden">
      {image ? (
        <div className="aspect-[4/5] w-full overflow-hidden bg-muted">
          <img
            src={image}
            alt={product.name}
            className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
          />
        </div>
      ) : (
        <div className="aspect-[4/5] w-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
          No image
        </div>
      )}

      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <h2 className="line-clamp-2 text-sm font-medium">
            {product.name}
          </h2>
          {product.gender && (
            <Badge variant="outline" className="whitespace-nowrap">
              {product.gender}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="pt-0 pb-2">
        <p className="text-sm font-semibold">{priceLabel}</p>
        {Array.isArray(product.variants) && product.variants.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">
            Sizes:{" "}
            {Array.from(
              new Set(product.variants.map((v: any) => v.size))
            ).join(", ")}
          </p>
        )}
      </CardContent>

      <CardFooter className="mt-auto flex gap-2">
        <Button
          variant="outline"
          size="sm"
          asChild
          className="w-full"
        >
          <Link href={`/products/${product.id}`}>
            Details
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
