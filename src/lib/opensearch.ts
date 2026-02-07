// src/lib/opensearch.ts
import { Client } from "@opensearch-project/opensearch";

let client: Client | null = null;

export function getOpenSearchClient(): Client | null {
  const node = process.env.OPENSEARCH_URL || "http://localhost:9200";

  try {
    if (!client) {
      client = new Client({ node });
      // not awaiting anything here – just instantiate
    }
    return client;
  } catch (err) {
    console.error("Failed to create OpenSearch client:", err);
    return null;
  }
}
