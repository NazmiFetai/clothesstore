// src/app/api/v2/graphql/route.ts
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { graphql, buildSchema } from "graphql";
import db from "@/lib/db";
import { requireRoleFromHeader } from "@/lib/roles";

// -------------------------------
// GraphQL schema (SDL)
// -------------------------------
const schema = buildSchema(`
  type ProductVariant {
    id: ID!
    sku: String
    price: Float!
    initialQuantity: Int!
    currentQuantity: Int!
    size: String
    color: String
  }

  type Product {
    id: ID!
    name: String!
    description: String
    defaultPrice: Float!
    category: String
    brand: String
    gender: String
    variants: [ProductVariant!]!
  }

  type ProductSearchResult {
    productId: ID!
    productName: String!
    variantId: ID!
    sku: String
    price: Float!
    initialQuantity: Int!
    soldQuantity: Int!
    currentQuantity: Int!
    category: String
    brand: String
    gender: String
    size: String
    color: String
  }

  input ProductFilterInput {
    search: String
    gender: String
    category: String
    brand: String
    size: String
    color: String
    priceMin: Float
    priceMax: Float
    available: Boolean
  }

  input ProductInput {
    name: String!
    description: String
    categoryId: ID
    brandId: ID
    genderId: ID
    defaultPrice: Float!
  }

  type Query {
    # Simple list (no filters, just pagination)
    products(limit: Int = 20, offset: Int = 0): [Product!]!

    # Advanced search, mirrors /api/v1/products/search
    searchProducts(
      filter: ProductFilterInput
      limit: Int = 50
      offset: Int = 0
    ): [ProductSearchResult!]!

    # Single product by id
    product(id: ID!): Product
  }

  type Mutation {
    createProduct(input: ProductInput!): Product!
    updateProduct(id: ID!, input: ProductInput!): Product!
    deleteProduct(id: ID!): Boolean!
  }

  schema {
    query: Query
    mutation: Mutation
  }
`);

type GraphQLContext = {
  authHeader: string | null;
};

// -------------------------------
// Helper: auth for mutations
// -------------------------------
async function assertProductWriteAccess(ctx: GraphQLContext) {
  await requireRoleFromHeader(ctx.authHeader, ["admin", "advanced_user"]);
}

// -------------------------------
// DB helpers
// -------------------------------
async function loadProductById(id: number) {
  const res = await db.query(
    `
    SELECT
      p.*,
      c.name AS category_name,
      b.name AS brand_name,
      g.name AS gender_name,
      (
        SELECT json_agg(
                 json_build_object(
                   'id', pv.id,
                   'sku', pv.sku,
                   'price', pv.price,
                   'initial_quantity', pv.initial_quantity,
                   'current_quantity',
                     pv.initial_quantity - COALESCE(sold.qty, 0),
                   'size', s.name,
                   'color', col.name
                 )
               )
        FROM product_variants pv
        LEFT JOIN sizes s ON s.id = pv.size_id
        LEFT JOIN colors col ON col.id = pv.color_id
        LEFT JOIN (
          SELECT product_variant_id, SUM(quantity) AS qty
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.status NOT IN ('cancelled')
          GROUP BY product_variant_id
        ) sold ON sold.product_variant_id = pv.id
        WHERE pv.product_id = p.id
          AND pv.deleted_at IS NULL
      ) AS variants
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN genders g ON g.id = p.gender_id
    WHERE p.id = $1
      AND p.deleted_at IS NULL
    `,
    [id],
  );

  if (!res.rowCount) return null;

  const row: any = res.rows[0];

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    defaultPrice: Number(row.default_price),
    category: row.category_name ?? null,
    brand: row.brand_name ?? null,
    gender: row.gender_name ?? null,
    variants: Array.isArray(row.variants)
      ? row.variants.map((v: any) => ({
          id: v.id,
          sku: v.sku,
          price: Number(v.price),
          initialQuantity: Number(v.initial_quantity),
          currentQuantity: Number(v.current_quantity),
          size: v.size,
          color: v.color,
        }))
      : [],
  };
}

async function listProducts(limit: number, offset: number) {
  const res = await db.query(
    `
    SELECT
      p.*,
      c.name AS category_name,
      b.name AS brand_name,
      g.name AS gender_name,
      (
        SELECT json_agg(
                 json_build_object(
                   'id', pv.id,
                   'sku', pv.sku,
                   'price', pv.price,
                   'initial_quantity', pv.initial_quantity,
                   'current_quantity',
                     pv.initial_quantity - COALESCE(sold.qty, 0),
                   'size', s.name,
                   'color', col.name
                 )
               )
        FROM product_variants pv
        LEFT JOIN sizes s ON s.id = pv.size_id
        LEFT JOIN colors col ON col.id = pv.color_id
        LEFT JOIN (
          SELECT product_variant_id, SUM(quantity) AS qty
          FROM order_items oi
          JOIN orders o ON o.id = oi.order_id
          WHERE o.status NOT IN ('cancelled')
          GROUP BY product_variant_id
        ) sold ON sold.product_variant_id = pv.id
        WHERE pv.product_id = p.id
          AND pv.deleted_at IS NULL
      ) AS variants
    FROM products p
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN genders g ON g.id = p.gender_id
    WHERE p.deleted_at IS NULL
    ORDER BY p.created_at DESC
    LIMIT $1 OFFSET $2
    `,
    [limit, offset],
  );

  return res.rows.map((row: any) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    defaultPrice: Number(row.default_price),
    category: row.category_name ?? null,
    brand: row.brand_name ?? null,
    gender: row.gender_name ?? null,
    variants: Array.isArray(row.variants)
      ? row.variants.map((v: any) => ({
          id: v.id,
          sku: v.sku,
          price: Number(v.price),
          initialQuantity: Number(v.initial_quantity),
          currentQuantity: Number(v.current_quantity),
          size: v.size,
          color: v.color,
        }))
      : [],
  }));
}

type ProductFilter = {
  search?: string | null;
  gender?: string | null;
  category?: string | null;
  brand?: string | null;
  size?: string | null;
  color?: string | null;
  priceMin?: number | null;
  priceMax?: number | null;
  available?: boolean | null;
};

async function searchProductsDb(
  filter: ProductFilter | undefined,
  limit: number,
  offset: number,
) {
  const f = filter || {};
  const conditions: string[] = [];
  const vals: any[] = [];

  const add = (cond: string, val: any) => {
    if (val === undefined || val === null) return;
    vals.push(val);
    conditions.push(cond.replace("?", `$${vals.length}`));
  };

  if (f.search && f.search.trim() !== "") {
    add("p.name ILIKE ?", `%${f.search.trim()}%`);
  }
  if (f.gender) add("g.name = ?", f.gender);
  if (f.category) add("c.name = ?", f.category);
  if (f.brand) add("b.name = ?", f.brand);
  if (f.size) add("s.name = ?", f.size);
  if (f.color) add("col.name = ?", f.color);

  if (f.priceMin !== undefined && f.priceMin !== null) {
    add("pv.price >= ?", f.priceMin);
  }
  if (f.priceMax !== undefined && f.priceMax !== null) {
    add("pv.price <= ?", f.priceMax);
  }

  if (f.available) {
    conditions.push("(pv.initial_quantity - COALESCE(sold.qty,0)) > 0");
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

  // Add limit & offset at the end
  vals.push(limit);
  vals.push(offset);
  const limitParam = `$${vals.length - 1}`;
  const offsetParam = `$${vals.length}`;

  const sql = `
    SELECT 
      p.id AS product_id,
      p.name AS product_name,
      pv.id AS variant_id,
      pv.sku,
      pv.price,
      pv.initial_quantity,
      COALESCE(sold.qty,0) AS sold_quantity,
      (pv.initial_quantity - COALESCE(sold.qty,0)) AS current_quantity,
      c.name AS category,
      b.name AS brand,
      g.name AS gender,
      s.name AS size,
      col.name AS color
    FROM product_variants pv
    JOIN products p ON p.id = pv.product_id
    LEFT JOIN categories c ON c.id = p.category_id
    LEFT JOIN brands b ON b.id = p.brand_id
    LEFT JOIN genders g ON g.id = p.gender_id
    LEFT JOIN sizes s ON s.id = pv.size_id
    LEFT JOIN colors col ON col.id = pv.color_id
    LEFT JOIN (
      SELECT product_variant_id, SUM(quantity) AS qty
      FROM order_items oi 
      JOIN orders o ON o.id = oi.order_id
      WHERE o.status NOT IN ('cancelled')
      GROUP BY product_variant_id
    ) sold ON sold.product_variant_id = pv.id
    ${where}
    ORDER BY p.id, pv.id
    LIMIT ${limitParam} OFFSET ${offsetParam}
  `;

  const res = await db.query(sql, vals);

  return res.rows.map((row: any) => ({
    productId: row.product_id,
    productName: row.product_name,
    variantId: row.variant_id,
    sku: row.sku,
    price: Number(row.price),
    initialQuantity: Number(row.initial_quantity),
    soldQuantity: Number(row.sold_quantity),
    currentQuantity: Number(row.current_quantity),
    category: row.category,
    brand: row.brand,
    gender: row.gender,
    size: row.size,
    color: row.color,
  }));
}

async function createProduct(input: any) {
  const res = await db.query(
    `
    INSERT INTO products (name, description, category_id, brand_id, gender_id, default_price)
    VALUES ($1,$2,$3,$4,$5,$6)
    RETURNING *
    `,
    [
      input.name,
      input.description || null,
      input.categoryId ? Number(input.categoryId) : null,
      input.brandId ? Number(input.brandId) : null,
      input.genderId ? Number(input.genderId) : null,
      input.defaultPrice,
    ],
  );

  return loadProductById(Number(res.rows[0].id));
}

async function updateProductDb(id: number, input: any) {
  const res = await db.query(
    `
    UPDATE products SET
      name = COALESCE($2, name),
      description = COALESCE($3, description),
      category_id = COALESCE($4, category_id),
      brand_id = COALESCE($5, brand_id),
      gender_id = COALESCE($6, gender_id),
      default_price = COALESCE($7, default_price),
      updated_at = NOW()
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING *
    `,
    [
      id,
      input.name ?? null,
      input.description ?? null,
      input.categoryId ? Number(input.categoryId) : null,
      input.brandId ? Number(input.brandId) : null,
      input.genderId ? Number(input.genderId) : null,
      input.defaultPrice ?? null,
    ],
  );

  if (!res.rowCount) return null;
  return loadProductById(id);
}

async function deleteProductDb(id: number) {
  const res = await db.query(
    `
    UPDATE products
    SET deleted_at = NOW()
    WHERE id = $1 AND deleted_at IS NULL
    RETURNING id
    `,
    [id],
  );

  return (res.rowCount ?? 0) > 0;
}

// -------------------------------
// Root resolvers
// -------------------------------
const root = {
  // Queries
  products: async ({ limit, offset }: { limit?: number; offset?: number }) => {
    const l = typeof limit === "number" ? limit : 20;
    const o = typeof offset === "number" ? offset : 0;
    return listProducts(l, o);
  },

  product: async ({ id }: { id: string }) => {
    const numId = Number(id);
    if (Number.isNaN(numId)) return null;
    return loadProductById(numId);
  },

  searchProducts: async ({
    filter,
    limit,
    offset,
  }: {
    filter?: ProductFilter;
    limit?: number;
    offset?: number;
  }) => {
    const l = typeof limit === "number" ? limit : 50;
    const o = typeof offset === "number" ? offset : 0;
    return searchProductsDb(filter, l, o);
  },

  // Mutations
  createProduct: async ({ input }: { input: any }, context: GraphQLContext) => {
    await assertProductWriteAccess(context);
    return createProduct(input);
  },

  updateProduct: async (
    { id, input }: { id: string; input: any },
    context: GraphQLContext,
  ) => {
    await assertProductWriteAccess(context);
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new Error("Invalid product id");
    }
    const updated = await updateProductDb(numId, input);
    if (!updated) {
      throw new Error("Product not found");
    }
    return updated;
  },

  deleteProduct: async ({ id }: { id: string }, context: GraphQLContext) => {
    await assertProductWriteAccess(context);
    const numId = Number(id);
    if (Number.isNaN(numId)) {
      throw new Error("Invalid product id");
    }
    return deleteProductDb(numId);
  },
};

// -------------------------------
// HTTP handler (POST /api/v2/graphql)
// -------------------------------
type GraphQLRequestBody = {
  query?: string;
  variables?: Record<string, any>;
  operationName?: string | null;
};

export async function POST(req: Request) {
  let body: GraphQLRequestBody;
  try {
    body = (await req.json()) as GraphQLRequestBody;
  } catch {
    return NextResponse.json(
      { errors: [{ message: "Invalid JSON body" }] },
      { status: 400 },
    );
  }

  if (!body.query) {
    return NextResponse.json(
      { errors: [{ message: "Missing 'query' field" }] },
      { status: 400 },
    );
  }

  const result = await graphql({
    schema,
    source: body.query,
    rootValue: root,
    variableValues: body.variables,
    operationName: body.operationName ?? undefined,
    contextValue: {
      authHeader: req.headers.get("authorization"),
    } as GraphQLContext,
  });

  const status = result.errors && result.errors.length > 0 ? 400 : 200;
  return NextResponse.json(result, { status });
}
