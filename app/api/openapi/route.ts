import { openApiSpec } from "@/lib/openapi/spec";

export const runtime = "nodejs";

export function GET() {
  return Response.json(openApiSpec);
}
