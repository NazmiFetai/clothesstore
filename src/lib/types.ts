// src/lib/types.ts

export type UserRole = "customer" | "admin";

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// ---- Products ----

export type Gender = "Men" | "Women" | "Unisex";

export interface ProductVariant {
  sku: string;
  size: "S" | "M" | "L" | "XL";
  color: string;
  stock: number;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  currency: string;
  categoryId: string;
  gender: Gender;
  images?: string[];
  variants: ProductVariant[];
}

export interface PaginatedResponse<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
}

export type ProductListResponse = PaginatedResponse<Product>;
