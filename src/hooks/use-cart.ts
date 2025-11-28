// src/hooks/use-cart.ts

"use client";

import { useCartContext } from "@/context/cart-context";

export default function useCart() {
  return useCartContext();
}
