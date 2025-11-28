// src/app/cart/page.tsx

"use client";

import useCart from "@/hooks/use-cart";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";

type CartItem = {
  variantId: number;
  productId: number | null;
  name: string;
  price: number;
  quantity: number;
  sizeLabel?: string;
  colorLabel?: string;
  imageUrl?: string | null;
};

export default function CartPage() {
  // If your useCart is strongly typed, drop the "as any" and align the types
  const { items, removeItem, updateQuantity, clearCart } = useCart() as any;
  const router = useRouter();

  const cartItems: CartItem[] = Array.isArray(items) ? items : [];

  const cartIsEmpty = cartItems.length === 0;

  const total = cartItems.reduce((sum, item) => {
    const price = Number(item.price);
    const qty = Number(item.quantity);
    if (Number.isNaN(price) || Number.isNaN(qty)) return sum;
    return sum + price * qty;
  }, 0);

  function handleDecrease(variantId: number, currentQty: number) {
    const newQty = currentQty - 1;
    if (newQty <= 0) {
      removeItem?.(variantId);
    } else {
      updateQuantity?.(variantId, newQty);
    }
  }

  function handleIncrease(variantId: number, currentQty: number) {
    const newQty = currentQty + 1;
    updateQuantity?.(variantId, newQty);
  }

  function handleCheckout() {
    // For now, just redirect to a placeholder – you’ll wire up real checkout later.
    router.push("/checkout");
  }

  return (
    <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8 py-6 space-y-4">
      <div className="flex items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-semibold">Your cart</h1>
          <p className="text-sm text-muted-foreground">
            Review your items before checkout.
          </p>
        </div>
        {!cartIsEmpty && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push("/")}
          >
            Continue shopping
          </Button>
        )}
      </div>

      {cartIsEmpty && (
        <Card>
          <CardHeader>
            <CardTitle>Cart is empty</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              You haven&apos;t added any items yet.
            </p>
            <Button onClick={() => router.push("/")}>Browse products</Button>
          </CardContent>
        </Card>
      )}

      {!cartIsEmpty && (
        <>
          <div className="rounded-md border overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead className="w-[140px]">Variant</TableHead>
                  <TableHead className="w-[100px] text-right">
                    Price
                  </TableHead>
                  <TableHead className="w-[140px] text-right">
                    Quantity
                  </TableHead>
                  <TableHead className="w-[100px] text-right">
                    Subtotal
                  </TableHead>
                  <TableHead className="w-[80px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {cartItems.map((item) => {
                  const priceLabel = Number.isFinite(Number(item.price))
                    ? Number(item.price).toFixed(2)
                    : String(item.price ?? "—");

                  const subtotal =
                    Number(item.price) * Number(item.quantity) || 0;
                  const subtotalLabel = subtotal.toFixed(2);

                  const variantParts: string[] = [];
                  if (item.sizeLabel) variantParts.push(item.sizeLabel);
                  if (item.colorLabel) variantParts.push(item.colorLabel);

                  return (
                    <TableRow key={item.variantId}>
                      <TableCell className="text-sm">
                        <div className="flex items-center gap-3">
                          {item.imageUrl && (
                            <div className="h-12 w-9 overflow-hidden rounded-md bg-muted">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <span>{item.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {variantParts.length > 0
                          ? variantParts.join(" · ")
                          : "—"}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {priceLabel}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleDecrease(
                                item.variantId,
                                Number(item.quantity)
                              )
                            }
                          >
                            −
                          </Button>
                          <span className="w-6 text-center text-sm">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() =>
                              handleIncrease(
                                item.variantId,
                                Number(item.quantity)
                              )
                            }
                          >
                            +
                          </Button>
                        </div>
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {subtotalLabel}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem?.(item.variantId)}
                        >
                          Remove
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-2 max-w-md">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  Cart total:
                </span>
                <span className="text-lg font-semibold">
                  {total.toFixed(2)}
                </span>
              </div>
              <Alert className="text-xs">
                <AlertDescription>
                  This is just the cart total. Shipping, discounts and taxes
                  (if any) would be applied at checkout.
                </AlertDescription>
              </Alert>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => clearCart?.()}
              >
                Clear cart
              </Button>
              <Button onClick={handleCheckout}>Proceed to checkout</Button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
