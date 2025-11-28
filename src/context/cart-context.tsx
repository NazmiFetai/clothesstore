// src/context/cart-context.tsx

"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  loadCart,
  saveCart,
  clearCartStorage,
  type StoredCartItem,
} from "@/lib/cart-storage";

export type CartItem = StoredCartItem;

type AddItemInput = {
  variantId: number;
  productId?: number | null;
  name: string;
  price: number;
  quantity?: number;
  imageUrl?: string;
  sizeLabel?: string;
  colorLabel?: string;
};

interface CartContextValue {
  items: CartItem[];
  totalQuantity: number;
  totalPrice: number;
  addItem: (item: AddItemInput) => void;
  removeItem: (variantId: number) => void;
  updateQuantity: (variantId: number, quantity: number) => void;
  clearCart: () => void;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  // load from localStorage on mount
  useEffect(() => {
    const stored = loadCart();
    setItems(stored);
  }, []);

  // persist whenever items change
  useEffect(() => {
    saveCart(items);
  }, [items]);

  const addItem = useCallback((input: AddItemInput) => {
    setItems((prev) => {
      const quantity = input.quantity ?? 1;
      if (quantity <= 0) return prev;

      const idx = prev.findIndex((it) => it.variantId === input.variantId);
      if (idx === -1) {
        return [
          ...prev,
          {
            variantId: input.variantId,
            productId:
              typeof input.productId === "number" ? input.productId : null,
            name: input.name,
            price: input.price,
            quantity,
            imageUrl: input.imageUrl,
            sizeLabel: input.sizeLabel,
            colorLabel: input.colorLabel,
          },
        ];
      }

      const copy = [...prev];
      copy[idx] = {
        ...copy[idx],
        quantity: copy[idx].quantity + quantity,
      };
      return copy;
    });
  }, []);

  const removeItem = useCallback((variantId: number) => {
    setItems((prev) => prev.filter((it) => it.variantId !== variantId));
  }, []);

  const updateQuantity = useCallback(
    (variantId: number, quantity: number) => {
      if (quantity <= 0) {
        // treat <= 0 as remove
        setItems((prev) => prev.filter((it) => it.variantId !== variantId));
        return;
      }
      setItems((prev) =>
        prev.map((it) =>
          it.variantId === variantId ? { ...it, quantity } : it
        )
      );
    },
    []
  );

  const clearCart = useCallback(() => {
    setItems([]);
    clearCartStorage();
  }, []);

  const { totalQuantity, totalPrice } = useMemo(() => {
    let qty = 0;
    let total = 0;
    for (const it of items) {
      qty += it.quantity;
      total += it.price * it.quantity;
    }
    return { totalQuantity: qty, totalPrice: total };
  }, [items]);

  const value = useMemo(
    () => ({
      items,
      totalQuantity,
      totalPrice,
      addItem,
      removeItem,
      updateQuantity,
      clearCart,
    }),
    [items, totalQuantity, totalPrice, addItem, removeItem, updateQuantity, clearCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCartContext() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCartContext must be used within CartProvider");
  return ctx;
}
