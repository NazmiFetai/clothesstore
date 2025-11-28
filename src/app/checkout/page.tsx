// src/app/checkout/page.tsx

"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/use-auth";
import useCart from "@/hooks/use-cart";
import { apiFetch } from "@/lib/api-client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function CheckoutPage() {
  const router = useRouter();
  const { user, token } = useAuth();
  const { items, totalPrice, clearCart } = useCart();

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState(user?.email ?? "");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [country, setCountry] = useState("");

  const [paymentMethod, setPaymentMethod] = useState("card");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const isLoggedIn = !!token && !!user;

  if (!isLoggedIn) {
    // you can also redirect directly, but a message is nicer
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-4">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          You must be logged in to place an order.
        </p>
        <Button onClick={() => router.push("/login?redirect=/checkout")}>
          Go to login
        </Button>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-4">
        <h1 className="text-2xl font-semibold">Checkout</h1>
        <p className="text-sm text-muted-foreground">
          Your cart is empty.
        </p>
        <Button onClick={() => router.push("/")}>Back to shop</Button>
      </div>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!email || !address || !city || !country) {
      setFormError("Email, address, city and country are required.");
      return;
    }

    if (!token || !user) {
      setFormError("You must be logged in.");
      return;
    }

    const clientPayload = {
      first_name: firstName || null,
      last_name: lastName || null,
      email,
      phone: phone || null,
      address,
      city,
      postal_code: postalCode || null,
      country,
    };

    const itemsPayload = items.map((it) => ({
      product_variant_id: it.variantId,
      unit_price: it.price,
      quantity: it.quantity,
    }));

    const body = {
      client: clientPayload,
      created_by: user.id,
      payment_method: paymentMethod,
      status: "pending",
      items: itemsPayload,
    };

    setSubmitting(true);
    try {
      await apiFetch("/api/orders", {
        method: "POST",
        body: JSON.stringify(body),
      }, token);

      clearCart();
      router.push("/orders"); // your "My orders" page
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to place order.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-6">
      <h1 className="text-2xl font-semibold">Checkout</h1>

      {formError && (
        <Alert variant="destructive">
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 md:grid-cols-[2fr,1.2fr]">
        {/* Client info form */}
        <Card>
          <CardHeader>
            <CardTitle>Billing & shipping details</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First name</Label>
                  <Input
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last name</Label>
                  <Input
                    id="lastName"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={submitting}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={submitting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={submitting}
                  required
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label htmlFor="city">City</Label>
                  <Input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="postalCode">Postal code</Label>
                  <Input
                    id="postalCode"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    disabled={submitting}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country</Label>
                  <Input
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    disabled={submitting}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Payment method</Label>
                <select
                  className="border rounded-md px-3 py-2 text-sm bg-background"
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  disabled={submitting}
                >
                  <option value="card">Card</option>
                  <option value="cash">Cash</option>
                </select>
              </div>

              <Button type="submit" disabled={submitting}>
                {submitting ? "Placing order..." : "Place order"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {items.map((it) => (
                <div
                  key={it.variantId}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex flex-col">
                    <span>{it.name}</span>
                    <span className="text-xs text-muted-foreground">
                      {[
                        it.sizeLabel || "",
                        it.colorLabel || "",
                      ]
                        .filter(Boolean)
                        .join(" • ")}
                    </span>
                  </div>
                  <div className="text-right">
                    <div>
                      {it.quantity} × {it.price.toFixed(2)}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {(it.price * it.quantity).toFixed(2)}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t pt-3 flex items-center justify-between text-sm font-medium">
              <span>Total</span>
              <span>{totalPrice.toFixed(2)}</span>
            </div>
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">
              This is a demo lab checkout. No real payments are processed.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
