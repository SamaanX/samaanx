import { parseMarketplaceSearchParams } from "@/domain/search";
import { searchPublicListings } from "@/features/search/queries/catalog";
import { apiError, apiSuccess } from "@/lib/api/route-utils";
import { getOptionalSessionProfile } from "@/lib/api/session-profile";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const params = Object.fromEntries(url.searchParams.entries());
    const filters = parseMarketplaceSearchParams(params);
    const session = await getOptionalSessionProfile();
    const result = await searchPublicListings(
      filters,
      session?.profile.id ?? null,
    );
    return apiSuccess(result);
  } catch (error) {
    return apiError(error, { route: "GET /api/v1/listings" });
  }
}
