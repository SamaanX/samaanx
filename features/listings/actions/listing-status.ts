"use server";

import { revalidateTag } from "next/cache";
import { after } from "next/server";

import { LISTING_IMAGES_BUCKET } from "@/features/listings/schemas/listing";
import { toListingActionError } from "@/features/listings/services/listing-errors";
import type { ListingActionResult } from "@/features/listings/types/listing";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { ActionTimeline } from "@/lib/perf/action-timeline";
import { scheduleLiveSyncAfterResponse } from "@/lib/realtime/schedule-live-sync";
import { createClient } from "@/lib/supabase/server";

function revalidateSellerPaths(_listingId: string) {
  // Public catalog cache only — seller list updates via client invalidate.
  revalidateTag("home-catalog", "max");
  revalidateTag("categories", "max");
}

function scheduleSellerPathsRevalidation(timeline: ActionTimeline) {
  after(() => {
    revalidateSellerPaths("");
  });
  timeline.mark("Revalidate scheduled (after response)");
}

export async function deleteListingAction(
  listingId: string,
): Promise<ListingActionResult<{ success: true }>> {
  try {
    const { profile } = await requireUser();
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, sellerId: profile.id, deletedAt: null },
      include: { images: true },
    });

    if (!listing) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Listing not found." },
      };
    }

    if (listing.images.length > 0) {
      const supabase = await createClient();
      await supabase.storage
        .from(LISTING_IMAGES_BUCKET)
        .remove(listing.images.map((image) => image.storagePath));
    }

    await prisma.$transaction([
      prisma.listingImage.deleteMany({ where: { listingId } }),
      prisma.listingAvailability.deleteMany({ where: { listingId } }),
      prisma.listing.update({
        where: { id: listingId },
        data: {
          deletedAt: new Date(),
          status: "ARCHIVED",
        },
      }),
    ]);

    after(() => {
      revalidateSellerPaths(listingId);
    });
    scheduleLiveSyncAfterResponse([profile.id]);
    return { ok: true, data: { success: true } };
  } catch (error) {
    logger.error("deleteListingAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toListingActionError(error) };
  }
}

export async function publishListingAction(
  listingId: string,
): Promise<ListingActionResult<{ success: true }>> {
  const timeline = new ActionTimeline();

  try {
    timeline.mark("Action start");

    const { profile } = await requireUser();
    timeline.mark("Auth + profile");

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, sellerId: profile.id, deletedAt: null },
      include: { images: true },
    });
    timeline.mark("Listing lookup");

    if (!listing) {
      timeline.done("publishListingAction");
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Listing not found." },
      };
    }

    if (listing.images.length < 1) {
      timeline.done("publishListingAction");
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Add at least one photo before publishing.",
        },
      };
    }

    if (listing.status === "ARCHIVED") {
      timeline.done("publishListingAction");
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Archived listings cannot be published.",
        },
      };
    }

    await prisma.listing.update({
      where: { id: listingId },
      data: {
        status: "ACTIVE",
        publishedAt: listing.publishedAt ?? new Date(),
      },
    });
    timeline.mark("Listing status update");

    scheduleSellerPathsRevalidation(timeline);
    scheduleLiveSyncAfterResponse([profile.id]);
    timeline.done("publishListingAction");
    return { ok: true, data: { success: true } };
  } catch (error) {
    timeline.mark("Error");
    timeline.done("publishListingAction");
    logger.error("publishListingAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toListingActionError(error) };
  }
}

export async function pauseListingAction(
  listingId: string,
): Promise<ListingActionResult<{ success: true }>> {
  try {
    const { profile } = await requireUser();
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, sellerId: profile.id, deletedAt: null },
    });

    if (!listing) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Listing not found." },
      };
    }

    if (listing.status !== "ACTIVE") {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Only active listings can be paused.",
        },
      };
    }

    await prisma.listing.update({
      where: { id: listingId },
      data: { status: "PAUSED" },
    });

    after(() => {
      revalidateSellerPaths(listingId);
    });
    scheduleLiveSyncAfterResponse([profile.id]);
    return { ok: true, data: { success: true } };
  } catch (error) {
    logger.error("pauseListingAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toListingActionError(error) };
  }
}

export async function archiveListingAction(
  listingId: string,
): Promise<ListingActionResult<{ success: true }>> {
  try {
    const { profile } = await requireUser();
    const listing = await prisma.listing.findFirst({
      where: { id: listingId, sellerId: profile.id, deletedAt: null },
    });

    if (!listing) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Listing not found." },
      };
    }

    await prisma.listing.update({
      where: { id: listingId },
      data: { status: "ARCHIVED" },
    });

    after(() => {
      revalidateSellerPaths(listingId);
    });
    scheduleLiveSyncAfterResponse([profile.id]);
    return { ok: true, data: { success: true } };
  } catch (error) {
    logger.error("archiveListingAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toListingActionError(error) };
  }
}
