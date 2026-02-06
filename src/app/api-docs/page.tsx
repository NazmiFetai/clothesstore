"use client";

import React from "react";
import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

export default function ApiDocsPage() {
  return (
    <main style={{ padding: "1rem" }}>
      <h1 style={{ fontFamily: "sans-serif", marginBottom: "1rem" }}>
        ClothesStore API – OpenAPI Docs
      </h1>
      <SwaggerUI url="/openapi.json" docExpansion="list" />
    </main>
  );
}
