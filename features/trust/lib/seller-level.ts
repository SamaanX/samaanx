import type { VerificationBadgeStatus } from "@prisma/client";

export type SellerLevelId = "new" | "trusted" | "top_rated" | "elite";

export type SellerLevel = {
  id: SellerLevelId;
  label: string;
  description: string;
};

export type TrustBadgeId =
  | "verified"
  | "new_seller"
  | "trusted_seller"
  | "top_rated"
  | "elite_seller"
  | "fast_responder";

export type TrustBadge = {
  id: TrustBadgeId;
  label: string;
  description: string;
};

export type TrustMetricsInput = {
  avgRating: number;
  ratingCount: number;
  completedRentalsCount: number;
  cancellationRate: number;
  responseTimeMinutesAvg: number | null;
  verificationBadge: VerificationBadgeStatus;
};

/**
 * Objective seller levels — higher tiers require stronger history.
 */
export function resolveSellerLevel(metrics: TrustMetricsInput): SellerLevel {
  const { avgRating, ratingCount, completedRentalsCount, cancellationRate } =
    metrics;

  if (
    completedRentalsCount >= 25 &&
    ratingCount >= 20 &&
    avgRating >= 4.7 &&
    cancellationRate <= 0.1
  ) {
    return {
      id: "elite",
      label: "Elite Seller",
      description: "Outstanding history with consistently high ratings.",
    };
  }

  if (completedRentalsCount >= 10 && ratingCount >= 10 && avgRating >= 4.5) {
    return {
      id: "top_rated",
      label: "Top Rated Seller",
      description: "Strong track record and highly rated by renters.",
    };
  }

  if (completedRentalsCount >= 3 && ratingCount >= 3 && avgRating >= 4.0) {
    return {
      id: "trusted",
      label: "Trusted Seller",
      description: "Proven rentals with solid community feedback.",
    };
  }

  return {
    id: "new",
    label: "New Seller",
    description: "Building a rental history on SamaanX.",
  };
}

export function resolveTrustBadges(metrics: TrustMetricsInput): TrustBadge[] {
  const level = resolveSellerLevel(metrics);
  const badges: TrustBadge[] = [];

  if (metrics.verificationBadge === "VERIFIED") {
    badges.push({
      id: "verified",
      label: "Verified",
      description: "Identity checks completed.",
    });
  }

  if (level.id === "elite") {
    badges.push({
      id: "elite_seller",
      label: "Elite Seller",
      description: level.description,
    });
  } else if (level.id === "top_rated") {
    badges.push({
      id: "top_rated",
      label: "Top Rated",
      description: level.description,
    });
  } else if (level.id === "trusted") {
    badges.push({
      id: "trusted_seller",
      label: "Trusted Seller",
      description: level.description,
    });
  } else {
    badges.push({
      id: "new_seller",
      label: "New Seller",
      description: level.description,
    });
  }

  if (
    metrics.responseTimeMinutesAvg != null &&
    metrics.responseTimeMinutesAvg <= 60
  ) {
    badges.push({
      id: "fast_responder",
      label: "Fast Responder",
      description: "Typically responds within an hour.",
    });
  }

  return badges;
}

export type RatingBreakdown = {
  average: number;
  total: number;
  counts: Record<1 | 2 | 3 | 4 | 5, number>;
  percents: Record<1 | 2 | 3 | 4 | 5, number>;
};

export function buildRatingBreakdown(ratings: number[]): RatingBreakdown {
  const counts: Record<1 | 2 | 3 | 4 | 5, number> = {
    1: 0,
    2: 0,
    3: 0,
    4: 0,
    5: 0,
  };
  for (const r of ratings) {
    const star = Math.min(5, Math.max(1, Math.round(r))) as 1 | 2 | 3 | 4 | 5;
    counts[star] += 1;
  }
  const total = ratings.length;
  const sum = ratings.reduce((a, b) => a + b, 0);
  const average = total === 0 ? 0 : Math.round((sum / total) * 100) / 100;
  const percents = {
    1: total ? Math.round((counts[1] / total) * 100) : 0,
    2: total ? Math.round((counts[2] / total) * 100) : 0,
    3: total ? Math.round((counts[3] / total) * 100) : 0,
    4: total ? Math.round((counts[4] / total) * 100) : 0,
    5: total ? Math.round((counts[5] / total) * 100) : 0,
  } as Record<1 | 2 | 3 | 4 | 5, number>;

  return { average, total, counts, percents };
}
