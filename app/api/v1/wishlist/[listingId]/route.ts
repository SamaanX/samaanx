import { isListingWishlisted } from "@/features/search/queries/listing-detail";
import { apiError, apiSuccess } from "@/lib/api/route-utils";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

export const runtime = "nodejs";

type RouteContext = {
  params: Promise<{ listingId: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { profile } = await requireUser();
    const { listingId } = await context.params;
    const wishlisted = await isListingWishlisted(listingId, profile.id);
    return apiSuccess({ wishlisted });
  } catch (error) {
    return apiError(error, { route: "GET /api/v1/wishlist/[listingId]" });
  }
}

export async function DELETE(_request: Request, context: RouteContext) {
  try {
    const { profile } = await requireUser();
    const { listingId } = await context.params;

    await prisma.wishlist.deleteMany({
      where: {
        userId: profile.id,
        listingId,
      },
    });

    return apiSuccess({ wishlisted: false });
  } catch (error) {
    return apiError(error, { route: "DELETE /api/v1/wishlist/[listingId]" });
  }
}
