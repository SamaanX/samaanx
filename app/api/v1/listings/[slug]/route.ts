import { getPublicListingBySlug } from "@/features/search/queries/listing-detail";
import { apiError, apiSuccess } from "@/lib/api/route-utils";
import { getOptionalSessionProfile } from "@/lib/api/session-profile";
import { AppError } from "@/lib/errors/app-error";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ slug: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { slug } = await context.params;
    const session = await getOptionalSessionProfile();
    const listing = await getPublicListingBySlug(slug, {
      viewerUserId: session?.profile.id ?? null,
    });

    if (!listing) {
      throw new AppError("Listing not found.", {
        code: "NOT_FOUND",
        status: 404,
      });
    }

    return apiSuccess(listing);
  } catch (error) {
    return apiError(error, { route: "GET /api/v1/listings/[slug]" });
  }
}
