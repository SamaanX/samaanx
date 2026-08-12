import type { NextRequest } from "next/server";

import { getWishlistListings } from "@/features/wishlist/queries/wishlist";
import type { WishlistSort } from "@/features/wishlist/types/wishlist";
import { apiError, apiSuccess } from "@/lib/api/route-utils";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";

export const runtime = "nodejs";

const SORT_VALUES: WishlistSort[] = [
  "recent",
  "price_asc",
  "price_desc",
  "title",
];

export async function GET(request: NextRequest) {
  try {
    const { profile } = await requireUser();
    const q = request.nextUrl.searchParams.get("q") ?? undefined;
    const sortParam = request.nextUrl.searchParams.get("sort") ?? "recent";
    const sort = SORT_VALUES.includes(sortParam as WishlistSort)
      ? (sortParam as WishlistSort)
      : "recent";

    const items = await getWishlistListings(profile.id, { q, sort });
    return apiSuccess(items);
  } catch (error) {
    return apiError(error, { route: "GET /api/v1/wishlist" });
  }
}

export async function POST(request: Request) {
  try {
    const { profile } = await requireUser();
    const body = (await request.json()) as { listingId?: string };
    const listingId = body.listingId?.trim();

    if (!listingId) {
      throw new AppError("listingId is required.", {
        code: "VALIDATION",
        status: 400,
      });
    }

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, status: "ACTIVE", deletedAt: null },
      select: { id: true },
    });

    if (!listing) {
      throw new AppError("Listing not found.", {
        code: "NOT_FOUND",
        status: 404,
      });
    }

    await prisma.wishlist.upsert({
      where: {
        userId_listingId: {
          userId: profile.id,
          listingId: listing.id,
        },
      },
      create: {
        userId: profile.id,
        listingId: listing.id,
      },
      update: {},
    });

    return apiSuccess({ wishlisted: true }, { status: 201 });
  } catch (error) {
    return apiError(error, { route: "POST /api/v1/wishlist" });
  }
}
