import type {
  PublicProfileView,
  ReviewCardView,
  ReviewEligibleRental,
} from "@/features/reviews/types/review";
import {
  buildRatingBreakdown,
  resolveSellerLevel,
  resolveTrustBadges,
} from "@/features/trust/lib/seller-level";
import { prisma } from "@/lib/db/prisma";

function decimalToNumber(value: { toNumber?: () => number } | number): number {
  if (typeof value === "number") return value;
  if (value && typeof value.toNumber === "function") return value.toNumber();
  return Number(value);
}

export async function getPublicProfileById(
  profileId: string,
): Promise<PublicProfileView | null> {
  const profile = await prisma.profile.findFirst({
    where: {
      id: profileId,
      deletedAt: null,
      status: "ACTIVE",
    },
    select: {
      id: true,
      displayName: true,
      avatarUrl: true,
      bio: true,
      city: true,
      area: true,
      preferredMode: true,
      verificationBadge: true,
      memberSince: true,
      avgRating: true,
      ratingCount: true,
      completedRentalsCount: true,
      responseTimeMinutesAvg: true,
      cancellationRate: true,
      listingsOwned: {
        where: { status: "ACTIVE", deletedAt: null },
        orderBy: { publishedAt: "desc" },
        take: 12,
        select: {
          id: true,
          slug: true,
          title: true,
          city: true,
          area: true,
          rentPriceAmount: true,
          rentPriceUnit: true,
          currency: true,
          images: {
            orderBy: { sortOrder: "asc" },
            take: 1,
            select: { url: true },
          },
        },
      },
      _count: {
        select: {
          listingsOwned: {
            where: { status: "ACTIVE", deletedAt: null },
          },
        },
      },
      reviewsReceived: {
        orderBy: { createdAt: "desc" },
        take: 50,
        select: {
          id: true,
          rating: true,
          comment: true,
          createdAt: true,
          rental: {
            select: {
              startDate: true,
              endDate: true,
              listing: { select: { title: true } },
            },
          },
          reviewer: {
            select: {
              id: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      },
    },
  });

  if (!profile) return null;

  const avgRating = decimalToNumber(profile.avgRating);
  const cancellationRate = decimalToNumber(profile.cancellationRate);
  const metrics = {
    avgRating,
    ratingCount: profile.ratingCount,
    completedRentalsCount: profile.completedRentalsCount,
    cancellationRate,
    responseTimeMinutesAvg: profile.responseTimeMinutesAvg,
    verificationBadge: profile.verificationBadge,
  };

  const reviews: ReviewCardView[] = profile.reviewsReceived.map((r) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment,
    createdAt: r.createdAt.toISOString(),
    rentalStartDate: r.rental.startDate.toISOString(),
    rentalEndDate: r.rental.endDate.toISOString(),
    listingTitle: r.rental.listing.title,
    reviewer: {
      id: r.reviewer.id,
      displayName: r.reviewer.displayName,
      avatarUrl: r.reviewer.avatarUrl,
    },
  }));

  const ratingBreakdown = buildRatingBreakdown(
    profile.reviewsReceived.map((r) => r.rating),
  );

  return {
    id: profile.id,
    displayName: profile.displayName,
    avatarUrl: profile.avatarUrl,
    bio: profile.bio,
    city: profile.city,
    area: profile.area,
    preferredMode: profile.preferredMode,
    verificationBadge: profile.verificationBadge,
    memberSince: profile.memberSince.toISOString(),
    avgRating,
    ratingCount: profile.ratingCount,
    completedRentalsCount: profile.completedRentalsCount,
    responseTimeMinutesAvg: profile.responseTimeMinutesAvg,
    cancellationRate,
    activeListingsCount: profile._count.listingsOwned,
    level: resolveSellerLevel(metrics),
    badges: resolveTrustBadges(metrics),
    ratingBreakdown,
    reviews,
    activeListings: profile.listingsOwned.map((l) => ({
      id: l.id,
      slug: l.slug,
      title: l.title,
      city: l.city,
      area: l.area,
      rentPriceAmount: Number(l.rentPriceAmount),
      rentPriceUnit: l.rentPriceUnit,
      currency: l.currency,
      coverImageUrl: l.images[0]?.url ?? null,
      avgRating,
    })),
  };
}

export async function getReviewEligibilityForUser(
  userId: string,
): Promise<ReviewEligibleRental[]> {
  const rentals = await prisma.rental.findMany({
    where: {
      status: "COMPLETED",
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    orderBy: { updatedAt: "desc" },
    take: 40,
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      startDate: true,
      endDate: true,
      listing: { select: { title: true, slug: true } },
      buyer: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
      seller: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
      reviews: {
        where: { reviewerId: userId },
        select: { id: true },
        take: 1,
      },
    },
  });

  return rentals.map((r) => {
    const isBuyer = r.buyerId === userId;
    const reviewee = isBuyer ? r.seller : r.buyer;
    return {
      rentalId: r.id,
      listingTitle: r.listing.title,
      listingSlug: r.listing.slug,
      revieweeId: reviewee.id,
      revieweeName: reviewee.displayName,
      revieweeAvatarUrl: reviewee.avatarUrl,
      role: isBuyer ? ("buyer" as const) : ("seller" as const),
      startDate: r.startDate.toISOString(),
      endDate: r.endDate.toISOString(),
      alreadyReviewed: r.reviews.length > 0,
    };
  });
}

export async function getReviewEligibilityForRental(
  rentalId: string,
  userId: string,
): Promise<ReviewEligibleRental | null> {
  const rental = await prisma.rental.findFirst({
    where: {
      id: rentalId,
      status: "COMPLETED",
      OR: [{ buyerId: userId }, { sellerId: userId }],
    },
    select: {
      id: true,
      buyerId: true,
      sellerId: true,
      startDate: true,
      endDate: true,
      listing: { select: { title: true, slug: true } },
      buyer: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
      seller: {
        select: { id: true, displayName: true, avatarUrl: true },
      },
      reviews: {
        where: { reviewerId: userId },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!rental) return null;

  const isBuyer = rental.buyerId === userId;
  const reviewee = isBuyer ? rental.seller : rental.buyer;

  return {
    rentalId: rental.id,
    listingTitle: rental.listing.title,
    listingSlug: rental.listing.slug,
    revieweeId: reviewee.id,
    revieweeName: reviewee.displayName,
    revieweeAvatarUrl: reviewee.avatarUrl,
    role: isBuyer ? ("buyer" as const) : ("seller" as const),
    startDate: rental.startDate.toISOString(),
    endDate: rental.endDate.toISOString(),
    alreadyReviewed: rental.reviews.length > 0,
  };
}
