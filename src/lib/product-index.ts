// src/lib/product-index.ts
import db from "@/lib/db";
import { getOpenSearchClient } from "./opensearch";

const INDEX_NAME = "products";

async function ensureIndex() {
  const client = getOpenSearchClient();
  if (!client) return;

  try {
    const exists = await client.indices.exists({ index: INDEX_NAME });
    if (!exists.body && !exists) {
      await client.indices.create({
        index: INDEX_NAME,
        body: {
          mappings: {
            properties: {
              productId: { type: "integer" },
              variantId: { type: "integer" },
              name: { type: "text" },
              description: { type: "text" },
              category: { type: "keyword" },
              brand: { type: "keyword" },
              gender: { type: "keyword" },
              sku: { type: "keyword" },
              price: { type: "float" },
              size: { type: "keyword" },
              color: { type: "keyword" },
              currentQuantity: { type: "integer" },
              inStock: { type: "boolean" },
            },
          },
        },
      });
    }
  } catch (err) {
    console.error("ensureIndex error:", err);
  }
}

/**
 * Load product + variants from DB and index in OpenSearch.
 * If the product is missing -> delete all docs for that productId.
 */
export async function reindexProduct(productId: number) {
  const client = getOpenSearchClient();
  if (!client) {
    console.warn("OpenSearch client not available, skipping indexing.");
    return;
  }

  await ensureIndex();

  // Pull product + variants with current stock from DB
  const res = await db.query(
    `
    SELECT
      p.id,
      p.name,
      p.description,
      p.default_price,
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
    [productId],
  );

  if (!res.rowCount) {
    // product gone -> delete docs from index
    try {
      await client.deleteByQuery({
        index: INDEX_NAME,
        body: {
          query: {
            term: { productId },
          },
        },
      });
    } catch (err) {
      console.error("deleteByQuery in reindexProduct:", err);
    }
    return;
  }

  const row: any = res.rows[0];
  const variants: any[] = Array.isArray(row.variants) ? row.variants : [];

  // If no variants, index base product as single doc
  const docs =
    variants.length > 0
      ? variants.map((v) => ({
          id: `p${row.id}-v${v.id}`,
          body: {
            productId: row.id,
            variantId: v.id,
            name: row.name,
            description: row.description,
            category: row.category_name ?? null,
            brand: row.brand_name ?? null,
            gender: row.gender_name ?? null,
            sku: v.sku ?? null,
            price: Number(v.price ?? row.default_price ?? 0),
            size: v.size ?? null,
            color: v.color ?? null,
            currentQuantity: Number(v.current_quantity ?? 0),
            inStock: Number(v.current_quantity ?? 0) > 0,
          },
        }))
      : [
          {
            id: `p${row.id}-base`,
            body: {
              productId: row.id,
              variantId: null,
              name: row.name,
              description: row.description,
              category: row.category_name ?? null,
              brand: row.brand_name ?? null,
              gender: row.gender_name ?? null,
              sku: null,
              price: Number(row.default_price ?? 0),
              size: null,
              color: null,
              currentQuantity: 0,
              inStock: false,
            },
          },
        ];

  // Bulk index
  const bulkBody: any[] = [];
  for (const d of docs) {
    bulkBody.push({
      index: { _index: INDEX_NAME, _id: d.id },
    });
    bulkBody.push(d.body);
  }

  try {
    await client.bulk({
      refresh: true,
      body: bulkBody,
    });
  } catch (err) {
    console.error("bulk index error in reindexProduct:", err);
  }
}

/**
 * Explicit delete from index (in case you need it after delete).
 */
export async function removeProductFromIndex(productId: number) {
  const client = getOpenSearchClient();
  if (!client) return;

  try {
    await client.deleteByQuery({
      index: INDEX_NAME,
      body: {
        query: {
          term: { productId },
        },
      },
    });
  } catch (err) {
    console.error("removeProductFromIndex error:", err);
  }
}
