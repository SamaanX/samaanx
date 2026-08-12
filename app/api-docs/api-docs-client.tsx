"use client";

import "swagger-ui-react/swagger-ui.css";

import dynamic from "next/dynamic";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export function ApiDocsClient() {
  return (
    <main className="min-h-dvh bg-white">
      <div className="border-b border-slate-200 px-4 py-4">
        <h1 className="text-xl font-semibold text-slate-900">
          SamaanX API Docs
        </h1>
        <p className="text-sm text-slate-600">
          OpenAPI documentation for SamaanX REST endpoints. Spec:{" "}
          <a href="/api/openapi" className="text-blue-600 underline">
            /api/openapi
          </a>
        </p>
      </div>
      <SwaggerUI
        url="/api/openapi"
        docExpansion="list"
        defaultModelsExpandDepth={1}
      />
    </main>
  );
}
