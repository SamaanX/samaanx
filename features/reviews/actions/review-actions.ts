"use server";

import {
  getPublicProfileById,
  getReviewEligibilityForRental,
  getReviewEligibilityForUser,
} from "@/features/reviews/queries/reviews";
import { submitReviewSchema } from "@/features/reviews/schemas/review";
import { toReviewActionError } from "@/features/reviews/services/review-errors";
import type {
  PublicProfileView,
  ReviewEligibleRental,
  TrustActionResult,
} from "@/features/reviews/types/review";
import { recomputeProfileRating } from "@/features/trust/services/trust-metrics";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";
import { logger } from "@/lib/logger";

export async function getPublicProfileAction(
  profileId: string,
): Promise<TrustActionResult<PublicProfileView>> {
  try {
    const data = await getPublicProfileById(profileId);
    if (!data) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Profile not found." },
      };
    }
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toReviewActionError(error) };
  }
}

export async function listReviewEligibleRentalsAction(): Promise<
  TrustActionResult<ReviewEligibleRental[]>
> {
  try {
    const { profile } = await requireUser();
    const data = await getReviewEligibilityForUser(profile.id);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toReviewActionError(error) };
  }
}

export async function getReviewEligibilityAction(
  rentalId: string,
): Promise<TrustActionResult<ReviewEligibleRental | null>> {
  try {
    const { profile } = await requireUser();
    const data = await getReviewEligibilityForRental(rentalId, profile.id);
    return { ok: true, data };
  } catch (error) {
    return { ok: false, error: toReviewActionError(error) };
  }
}

export async function submitReviewAction(
  input: unknown,
): Promise<TrustActionResult<{ reviewId: string; revieweeId: string }>> {
  try {
    const { profile } = await requireUser();
    const parsed = submitReviewSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid review.",
        },
      };
    }

    const rental = await prisma.rental.findFirst({
      where: { id: parsed.data.rentalId },
      select: {
        id: true,
        status: true,
        buyerId: true,
        sellerId: true,
        listing: { select: { title: true } },
      },
    });

    if (!rental) {
      throw new AppError("Rental not found.", {
        code: "NOT_FOUND",
        status: 404,
      });
    }

    if (rental.status !== "COMPLETED") {
      throw new AppError("You can only review after the rental is completed.", {
        code: "CONFLICT",
        status: 409,
      });
    }

    const isBuyer = rental.buyerId === profile.id;
    const isSeller = rental.sellerId === profile.id;
    if (!isBuyer && !isSeller) {
      throw new AppError("You are not part of this rental.", {
        code: "FORBIDDEN",
        status: 403,
      });
    }

    const revieweeId = isBuyer ? rental.sellerId : rental.buyerId;

    const existing = await prisma.review.findUnique({
      where: {
        rentalId_reviewerId: {
          rentalId: rental.id,
          reviewerId: profile.id,
        },
      },
      select: { id: true },
    });
    if (existing) {
      throw new AppError("You have already reviewed this rental.", {
        code: "CONFLICT",
        status: 409,
      });
    }

    const review = await prisma.$transaction(async (tx) => {
      const created = await tx.review.create({
        data: {
          rentalId: rental.id,
          reviewerId: profile.id,
          revieweeId,
          target: "USER",
          rating: parsed.data.rating,
          comment: parsed.data.comment ?? null,
        },
        select: { id: true },
      });

      await recomputeProfileRating(revieweeId, tx);
      return created;
    });

    return {
      ok: true,
      data: { reviewId: review.id, revieweeId },
    };
  } catch (error) {
    logger.error("submitReviewAction failed", {
      message: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: toReviewActionError(error) };
  }
}
