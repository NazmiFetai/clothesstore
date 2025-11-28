// src/lib/cart-storage.ts

export type StoredCartItem = {
  variantId: number; // product_variants.id
  productId: number | null; // products.id (optional)
  name: string; // product name
  price: number; // unit price in your DB currency
  quantity: number; // >= 1
  imageUrl?: string;
  sizeLabel?: string;
  colorLabel?: string;
};

const CART_KEY = "cart_v1";

export function loadCart(): StoredCartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed;
  } catch (e) {
    console.error("Failed to load cart from storage:", e);
    return [];
  }
}

export function saveCart(items: StoredCartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_KEY, JSON.stringify(items));
  } catch (e) {
    console.error("Failed to save cart:", e);
  }
}

export function clearCartStorage() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CART_KEY);
  } catch (e) {
    console.error("Failed to clear cart:", e);
  }
}
