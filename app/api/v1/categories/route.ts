import { getActiveCategories } from "@/features/listings/queries/categories";
import { apiError, apiSuccess } from "@/lib/api/route-utils";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await getActiveCategories();
    return apiSuccess(categories);
  } catch (error) {
    return apiError(error, { route: "GET /api/v1/categories" });
  }
}
