"use server";

import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { after } from "next/server";

import {
  LISTING_IMAGES_BUCKET,
  listingFormSchema,
  type ListingImageMeta,
} from "@/features/listings/schemas/listing";
import { resolveDepositFields } from "@/features/listings/services/deposit";
import { toListingActionError } from "@/features/listings/services/listing-errors";
import { toSellerListingDetailView } from "@/features/listings/services/listing-mappers";
import { buildListingSlug } from "@/features/listings/services/slug";
import type {
  ListingActionResult,
  SellerListingDetailView,
} from "@/features/listings/types/listing";
import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { logger } from "@/lib/logger";
import { ActionTimeline } from "@/lib/perf/action-timeline";
import { scheduleLiveSyncAfterResponse } from "@/lib/realtime/schedule-live-sync";
import { createClient } from "@/lib/supabase/server";

function revalidateSellerListingPaths() {
  revalidateTag("home-catalog", "max");
  revalidateTag("categories", "max");
}

function scheduleSellerListingRevalidation(timeline: ActionTimeline) {
  after(() => {
    revalidateSellerListingPaths();
  });
  timeline.mark("Revalidate scheduled (after response)");
}

function parseListingPayload(raw: unknown) {
  const json =
    typeof raw === "string"
      ? (() => {
          try {
            return JSON.parse(raw) as unknown;
          } catch {
            return null;
          }
        })()
      : raw;

  if (json == null) {
    return { ok: false as const, message: "Invalid listing payload." };
  }

  const parsed = listingFormSchema.safeParse(json);
  if (!parsed.success) {
    return {
      ok: false as const,
      message: parsed.error.issues[0]?.message ?? "Invalid listing data.",
    };
  }

  return { ok: true as const, data: parsed.data };
}

async function reassignKeptImageSortOrders(imageIds: string[]): Promise<void> {
  if (imageIds.length === 0) {
    return;
  }

  await prisma.$transaction(async (tx) => {
    await Promise.all(
      imageIds.map((id, index) =>
        tx.listingImage.update({
          where: { id },
          data: { sortOrder: index + 1000 },
        }),
      ),
    );
    await Promise.all(
      imageIds.map((id, index) =>
        tx.listingImage.update({
          where: { id },
          data: { sortOrder: index },
        }),
      ),
    );
  });
}

/**
 * Creates the listing row (no photos). Client uploads photos directly to Supabase,
 * then calls registerListingImagesAction.
 */
export async function beginCreateListingAction(
  payloadInput: unknown,
): Promise<ListingActionResult<{ id: string; userId: string }>> {
  const timeline = new ActionTimeline();

  try {
    timeline.mark("Action start");

    const { user, profile } = await requireUser();
    timeline.mark("Auth + profile");

    const payload = parseListingPayload(payloadInput);
    timeline.mark("Validate payload");
    if (!payload.ok) {
      timeline.done("beginCreateListingAction");
      return {
        ok: false,
        error: { code: "VALIDATION", message: payload.message },
      };
    }

    const category = await prisma.category.findFirst({
      where: { id: payload.data.categoryId, isActive: true },
    });
    timeline.mark("Category lookup");
    if (!category) {
      timeline.done("beginCreateListingAction");
      return {
        ok: false,
        error: { code: "VALIDATION", message: "Choose a valid category." },
      };
    }

    if (
      payload.data.status === "PAUSED" ||
      payload.data.status === "ARCHIVED"
    ) {
      timeline.done("beginCreateListingAction");
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "New listings can only start as Draft or Active.",
        },
      };
    }

    const deposit = resolveDepositFields(payload.data);
    const slug = buildListingSlug(payload.data.title);
    const publishedAt = payload.data.status === "ACTIVE" ? new Date() : null;

    const listing = await prisma.listing.create({
      data: {
        sellerId: profile.id,
        categoryId: payload.data.categoryId,
        title: payload.data.title,
        slug,
        description: payload.data.description,
        status: payload.data.status,
        rentPriceAmount: new Prisma.Decimal(payload.data.rentPriceAmount),
        rentPriceUnit: payload.data.rentPriceUnit,
        currency: "PKR",
        depositType: deposit.depositType,
        depositAmount:
          deposit.depositAmount === null
            ? null
            : new Prisma.Decimal(deposit.depositAmount),
        depositPercent:
          deposit.depositPercent === null
            ? null
            : new Prisma.Decimal(deposit.depositPercent),
        city: payload.data.city,
        area: payload.data.area,
        countryCode: payload.data.countryCode,
        lat: payload.data.lat,
        lng: payload.data.lng,
        showExactPickup: payload.data.showExactPickup ?? false,
        publishedAt,
        availability: {
          create: payload.data.availability.map((row) => ({
            type: row.type,
            startDate: new Date(row.startDate),
            endDate: new Date(row.endDate),
            notes: row.notes ?? null,
          })),
        },
      },
    });
    timeline.mark("Listing insert + availability");
    timeline.done("beginCreateListingAction");

    return { ok: true, data: { id: listing.id, userId: user.id } };
  } catch (error) {
    timeline.mark("Error");
    timeline.done("beginCreateListingAction");
    logger.error("beginCreateListingAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toListingActionError(error) };
  }
}

export async function rollbackListingDraftAction(
  listingId: string,
): Promise<void> {
  try {
    const { profile } = await requireUser();
    await prisma.listing.updateMany({
      where: { id: listingId, sellerId: profile.id, deletedAt: null },
      data: { deletedAt: new Date(), status: "ARCHIVED" },
    });
  } catch (error) {
    logger.error("rollbackListingDraftAction failed", {
      listingId,
      message: error instanceof Error ? error.message : "unknown_error",
    });
  }
}

export async function registerListingImagesAction(
  listingId: string,
  images: ListingImageMeta[],
): Promise<ListingActionResult<{ id: string }>> {
  const timeline = new ActionTimeline();

  try {
    timeline.mark("Action start");

    const { profile } = await requireUser();
    timeline.mark("Auth + profile");

    if (images.length < 1) {
      timeline.done("registerListingImagesAction");
      return {
        ok: false,
        error: { code: "VALIDATION", message: "Add at least one photo." },
      };
    }

    const listing = await prisma.listing.findFirst({
      where: { id: listingId, sellerId: profile.id, deletedAt: null },
      select: { id: true },
    });
    timeline.mark("Listing ownership check");

    if (!listing) {
      timeline.done("registerListingImagesAction");
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Listing not found." },
      };
    }

    await prisma.listingImage.createMany({
      data: images.map((image) => ({
        listingId,
        storagePath: image.storagePath,
        url: image.url,
        sortOrder: image.sortOrder,
        byteSize: image.byteSize,
      })),
    });
    timeline.mark("Image database writes");

    scheduleSellerListingRevalidation(timeline);
    scheduleLiveSyncAfterResponse([profile.id]);
    timeline.done("registerListingImagesAction");
    return { ok: true, data: { id: listingId } };
  } catch (error) {
    timeline.mark("Error");
    timeline.done("registerListingImagesAction");
    logger.error("registerListingImagesAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toListingActionError(error) };
  }
}

/** @deprecated Use beginCreateListingAction + client upload + registerListingImagesAction */
export async function createListingAction(
  formData: FormData,
): Promise<ListingActionResult<{ id: string }>> {
  const payload = formData.get("payload");
  const begin = await beginCreateListingAction(payload);
  if (!begin.ok) {
    return begin;
  }

  return {
    ok: false,
    error: {
      code: "VALIDATION",
      message:
        "Use the updated listing form upload flow. Refresh the page and try again.",
    },
  };
}

type UpdateListingInput = {
  payload: unknown;
  keepImageIds: string[];
  newImages: ListingImageMeta[];
};

export async function updateListingAction(
  listingId: string,
  input: UpdateListingInput | FormData,
): Promise<ListingActionResult<SellerListingDetailView>> {
  const timeline = new ActionTimeline();

  try {
    timeline.mark("Action start");

    const normalized: UpdateListingInput =
      input instanceof FormData
        ? {
            payload: input.get("payload"),
            keepImageIds: (() => {
              const raw = input.get("keepImageIds");
              if (typeof raw !== "string" || raw.length === 0) return [];
              try {
                const parsed: unknown = JSON.parse(raw);
                return Array.isArray(parsed) ? (parsed as string[]) : [];
              } catch {
                return [];
              }
            })(),
            newImages: [],
          }
        : input;

    const { profile } = await requireUser();
    timeline.mark("Auth + profile");

    const existing = await prisma.listing.findFirst({
      where: { id: listingId, sellerId: profile.id, deletedAt: null },
      include: { images: true },
    });
    timeline.mark("Existing listing lookup");

    if (!existing) {
      timeline.done("updateListingAction");
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Listing not found." },
      };
    }

    const payload = parseListingPayload(normalized.payload);
    timeline.mark("Validate payload");
    if (!payload.ok) {
      timeline.done("updateListingAction");
      return {
        ok: false,
        error: { code: "VALIDATION", message: payload.message },
      };
    }

    const keepImageIds = normalized.keepImageIds;
    const newImages = normalized.newImages;
    timeline.mark("Parse images metadata", {
      kept: keepImageIds.length,
      newCount: newImages.length,
    });

    const keptImages = existing.images
      .filter((image) => keepImageIds.includes(image.id))
      .sort((a, b) => keepImageIds.indexOf(a.id) - keepImageIds.indexOf(b.id));

    const totalImages = keptImages.length + newImages.length;
    if (totalImages < 1) {
      timeline.done("updateListingAction");
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: "Keep at least one photo.",
        },
      };
    }

    const category = await prisma.category.findFirst({
      where: { id: payload.data.categoryId, isActive: true },
    });
    timeline.mark("Category lookup");
    if (!category) {
      timeline.done("updateListingAction");
      return {
        ok: false,
        error: { code: "VALIDATION", message: "Choose a valid category." },
      };
    }

    const deposit = resolveDepositFields(payload.data);
    const removedImages = existing.images.filter(
      (image) => !keepImageIds.includes(image.id),
    );
    timeline.mark("Resolve deposit + diff images");

    if (removedImages.length > 0) {
      const supabase = await createClient();
      await Promise.all([
        supabase.storage
          .from(LISTING_IMAGES_BUCKET)
          .remove(removedImages.map((image) => image.storagePath)),
        prisma.listingImage.deleteMany({
          where: {
            listingId,
            id: { in: removedImages.map((image) => image.id) },
          },
        }),
      ]);
      timeline.mark("Remove deleted images (storage + DB parallel)", {
        count: removedImages.length,
      });
    }

    await reassignKeptImageSortOrders(keptImages.map((image) => image.id));
    timeline.mark("Reorder kept images", { count: keptImages.length });

    if (newImages.length > 0) {
      await prisma.listingImage.createMany({
        data: newImages.map((image) => ({
          listingId,
          storagePath: image.storagePath,
          url: image.url,
          sortOrder: image.sortOrder,
          byteSize: image.byteSize,
        })),
      });
      timeline.mark("New image database writes");
    }

    const nextStatus = payload.data.status;
    const publishedAt =
      nextStatus === "ACTIVE"
        ? (existing.publishedAt ?? new Date())
        : existing.publishedAt;

    await prisma.$transaction([
      prisma.listingAvailability.deleteMany({ where: { listingId } }),
      prisma.listing.update({
        where: { id: listingId },
        data: {
          categoryId: payload.data.categoryId,
          title: payload.data.title,
          description: payload.data.description,
          status: nextStatus,
          rentPriceAmount: new Prisma.Decimal(payload.data.rentPriceAmount),
          rentPriceUnit: payload.data.rentPriceUnit,
          depositType: deposit.depositType,
          depositAmount:
            deposit.depositAmount === null
              ? null
              : new Prisma.Decimal(deposit.depositAmount),
          depositPercent:
            deposit.depositPercent === null
              ? null
              : new Prisma.Decimal(deposit.depositPercent),
          city: payload.data.city,
          area: payload.data.area,
          countryCode: payload.data.countryCode,
          lat: payload.data.lat,
          lng: payload.data.lng,
          showExactPickup: payload.data.showExactPickup ?? false,
          publishedAt,
          availability: {
            create: payload.data.availability.map((row) => ({
              type: row.type,
              startDate: new Date(row.startDate),
              endDate: new Date(row.endDate),
              notes: row.notes ?? null,
            })),
          },
        },
      }),
    ]);
    timeline.mark("Listing update transaction");

    const updated = await prisma.listing.findFirstOrThrow({
      where: { id: listingId },
      include: { images: true, availability: true },
    });
    timeline.mark("Reload listing for response");

    scheduleSellerListingRevalidation(timeline);
    timeline.done("updateListingAction");
    return { ok: true, data: toSellerListingDetailView(updated) };
  } catch (error) {
    timeline.mark("Error");
    timeline.done("updateListingAction");
    logger.error("updateListingAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toListingActionError(error) };
  }
}
