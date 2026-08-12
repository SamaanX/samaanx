import type { Metadata } from "next";

import { ApiDocsClient } from "@/app/api-docs/api-docs-client";

export const metadata: Metadata = {
  title: "API Docs",
  description: "SamaanX OpenAPI documentation",
  robots: { index: false, follow: false },
};

export default function ApiDocsPage() {
  return <ApiDocsClient />;
}
