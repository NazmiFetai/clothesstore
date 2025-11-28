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

export interface Client {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  country: string | null;
  created_at: string;
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

// src/lib/types.ts

export interface OrderItem {
  id: number;
  order_id: number;
  product_variant_id: number;
  unit_price: number;
  quantity: number;
  subtotal: number;
  created_at: string;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export interface Order {
  id: string;
  client_id: string | null;
  created_by: string | null;
  status: OrderStatus | string;
  payment_method: string | null;
  total_amount: string; // "135.00"
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

// --- Discounts ---
export type DiscountType = "percentage" | "fixed";

// src/lib/types.ts

export type Discount = {
  id: string;
  name: string;
  type: string; // e.g. "percent" or "fixed"
  value: string | number;
  start_date: string | null;
  end_date: string | null;
  active: boolean;
  created_at: string;
};

// --- Reports ---
export type DailyReport = {
  date: string; // "YYYY-MM-DD"
  orders: number;
  revenue: number;
  topProducts: {
    productId: string;
    name: string;
    units: number;
  }[];
};

export type ProductListResponse = PaginatedResponse<Product>;
