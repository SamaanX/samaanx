import "server-only";

import { toPublicListingCardView } from "@/features/search/services/mappers";
import type { PublicListingCardView } from "@/features/search/types/marketplace";
import type { WishlistSort } from "@/features/wishlist/types/wishlist";
import { prisma } from "@/lib/db/prisma";
import { withPerf } from "@/lib/perf";

export type { WishlistSort } from "@/features/wishlist/types/wishlist";

export async function getWishlistListings(
  userId: string,
  options?: { q?: string; sort?: WishlistSort },
): Promise<PublicListingCardView[]> {
  return withPerf("wishlist.list", async () => {
    const q = options?.q?.trim() ?? "";
    const sort = options?.sort ?? "recent";

    const rows = await prisma.wishlist.findMany({
      where: {
        userId,
        listing: {
          deletedAt: null,
          ...(q
            ? {
                OR: [
                  { title: { contains: q, mode: "insensitive" } },
                  { city: { contains: q, mode: "insensitive" } },
                  { area: { contains: q, mode: "insensitive" } },
                ],
              }
            : {}),
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
      select: {
        createdAt: true,
        listing: {
          select: {
            id: true,
            slug: true,
            title: true,
            city: true,
            area: true,
            lat: true,
            lng: true,
            status: true,
            rentPriceAmount: true,
            rentPriceUnit: true,
            currency: true,
            publishedAt: true,
            category: { select: { name: true, slug: true } },
            images: {
              select: { url: true, sortOrder: true },
              orderBy: { sortOrder: "asc" },
              take: 1,
            },
            _count: { select: { images: true } },
            seller: {
              select: {
                avgRating: true,
                ratingCount: true,
                verificationBadge: true,
                completedRentalsCount: true,
                responseTimeMinutesAvg: true,
              },
            },
            availability: {
              select: { type: true, startDate: true, endDate: true },
              take: 4,
              orderBy: { startDate: "asc" },
            },
          },
        },
      },
    });

    let items = rows.map((row) =>
      toPublicListingCardView({
        ...row.listing,
        wishlists: [{ id: "saved" }],
      }),
    );

    // Non-ACTIVE saved listings still show with Unavailable badge.
    items = items.map((item, index) => {
      const status = rows[index]?.listing.status;
      if (status && status !== "ACTIVE") {
        return {
          ...item,
          availabilityLabel: "Unavailable" as const,
          status: "INACTIVE" as const,
        };
      }
      return item;
    });

    switch (sort) {
      case "price_asc":
        items = [...items].sort(
          (a, b) => a.rentPriceAmount - b.rentPriceAmount,
        );
        break;
      case "price_desc":
        items = [...items].sort(
          (a, b) => b.rentPriceAmount - a.rentPriceAmount,
        );
        break;
      case "title":
        items = [...items].sort((a, b) => a.title.localeCompare(b.title));
        break;
      case "recent":
      default:
        break;
    }

    return items;
  });
}

export async function getWishlistCount(userId: string): Promise<number> {
  return prisma.wishlist.count({ where: { userId } });
}
