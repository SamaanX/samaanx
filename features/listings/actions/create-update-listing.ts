"use server";

import { Prisma } from "@prisma/client";
import { revalidateTag } from "next/cache";
import { after } from "next/server";

import {
  isAllowedListingImageMime,
  LISTING_IMAGE_MAX,
  LISTING_IMAGE_MAX_BYTES,
  LISTING_IMAGE_MIN,
  LISTING_IMAGES_BUCKET,
  listingFormSchema,
} from "@/features/listings/schemas/listing";
import { resolveDepositFields } from "@/features/listings/services/deposit";
import { toListingActionError } from "@/features/listings/services/listing-errors";
import {
  buildListingImagePath,
  extensionForListingMime,
  getListingImagePublicUrl,
} from "@/features/listings/services/listing-image-storage";
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
import { createClient } from "@/lib/supabase/server";

function revalidateSellerListingPaths() {
  // Public catalog only — seller UI uses client query cache (no page refresh).
  revalidateTag("home-catalog", "max");
  revalidateTag("categories", "max");
}

function scheduleSellerListingRevalidation(timeline: ActionTimeline) {
  after(() => {
    const revalidateStart = performance.now();
    revalidateSellerListingPaths();
    const revalidateMs = Math.round(performance.now() - revalidateStart);
    if (revalidateMs > 100) {
      logger.warn("listing.publish.slow_step", {
        label: "Revalidate (after response)",
        stepMs: revalidateMs,
        exceeds300ms: revalidateMs > 300,
      });
    }
  });
  timeline.mark("Revalidate scheduled (after response)");
}

function parseListingPayload(raw: unknown) {
  if (typeof raw !== "string") {
    return {
      ok: false as const,
      message: "Invalid listing payload.",
    };
  }

  try {
    const json: unknown = JSON.parse(raw);
    const parsed = listingFormSchema.safeParse(json);
    if (!parsed.success) {
      return {
        ok: false as const,
        message: parsed.error.issues[0]?.message ?? "Invalid listing data.",
      };
    }
    return { ok: true as const, data: parsed.data };
  } catch {
    return { ok: false as const, message: "Invalid listing payload." };
  }
}

function collectImageFiles(formData: FormData): File[] {
  return formData
    .getAll("images")
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function validateImageFiles(files: File[]): string | null {
  if (files.length < LISTING_IMAGE_MIN) {
    return `Add at least ${LISTING_IMAGE_MIN} photo.`;
  }
  if (files.length > LISTING_IMAGE_MAX) {
    return `You can upload up to ${LISTING_IMAGE_MAX} photos.`;
  }

  for (const file of files) {
    if (!isAllowedListingImageMime(file.type)) {
      return "Photos must be JPG, PNG, or WebP.";
    }
    if (file.size > LISTING_IMAGE_MAX_BYTES) {
      return "Each photo must be 5 MB or smaller.";
    }
  }

  return null;
}

type UploadedListingImage = {
  storagePath: string;
  url: string;
  sortOrder: number;
  byteSize: number;
};

async function reassignKeptImageSortOrders(imageIds: string[]): Promise<void> {
  if (imageIds.length === 0) {
    return;
  }

  // Two parallel batches avoid sort_order unique collisions without 2N sequential round-trips.
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

async function uploadListingImages(params: {
  userId: string;
  listingId: string;
  files: File[];
  startSortOrder?: number;
}): Promise<
  | { ok: true; images: UploadedListingImage[]; uploadMs: number }
  | { ok: false; message: string }
> {
  const uploadStart = performance.now();
  const supabase = await createClient();
  const start = params.startSortOrder ?? 0;
  const stamp = Date.now();
  const uploadedPaths: string[] = [];

  try {
    const images = await Promise.all(
      params.files.map(async (file, index) => {
        const ext = extensionForListingMime(file.type);
        const objectPath = buildListingImagePath(
          params.userId,
          params.listingId,
          `${start + index}-${stamp}.${ext}`,
        );
        const bytes = new Uint8Array(await file.arrayBuffer());

        const { error } = await supabase.storage
          .from(LISTING_IMAGES_BUCKET)
          .upload(objectPath, bytes, {
            contentType: file.type,
            upsert: false,
            cacheControl: "3600",
          });

        if (error) {
          throw new Error(error.message);
        }

        uploadedPaths.push(objectPath);

        return {
          storagePath: objectPath,
          url: getListingImagePublicUrl(objectPath),
          sortOrder: start + index,
          byteSize: file.size,
        };
      }),
    );

    return {
      ok: true,
      images,
      uploadMs: Math.round(performance.now() - uploadStart),
    };
  } catch (error) {
    logger.error("Listing image upload failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });

    if (uploadedPaths.length > 0) {
      await supabase.storage.from(LISTING_IMAGES_BUCKET).remove(uploadedPaths);
    }

    return {
      ok: false,
      message: "Could not upload photos. Please try again.",
    };
  }
}

export async function createListingAction(
  formData: FormData,
): Promise<ListingActionResult<{ id: string }>> {
  const timeline = new ActionTimeline();

  try {
    timeline.mark("Action start");

    const { user, profile } = await requireUser();
    timeline.mark("Auth + profile");

    const payload = parseListingPayload(formData.get("payload"));
    timeline.mark("Validate payload");
    if (!payload.ok) {
      timeline.done("createListingAction");
      return {
        ok: false,
        error: { code: "VALIDATION", message: payload.message },
      };
    }

    const files = collectImageFiles(formData);
    timeline.mark("Collect image files", {
      count: files.length,
      totalBytes: files.reduce((sum, file) => sum + file.size, 0),
    });

    const imageError = validateImageFiles(files);
    timeline.mark("Validate image files");
    if (imageError) {
      timeline.done("createListingAction");
      return {
        ok: false,
        error: { code: "VALIDATION", message: imageError },
      };
    }

    const category = await prisma.category.findFirst({
      where: { id: payload.data.categoryId, isActive: true },
    });
    timeline.mark("Category lookup");
    if (!category) {
      timeline.done("createListingAction");
      return {
        ok: false,
        error: { code: "VALIDATION", message: "Choose a valid category." },
      };
    }

    if (
      payload.data.status === "PAUSED" ||
      payload.data.status === "ARCHIVED"
    ) {
      timeline.done("createListingAction");
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
    timeline.mark("Resolve deposit + slug");

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

    const upload = await uploadListingImages({
      userId: user.id,
      listingId: listing.id,
      files,
    });
    timeline.mark("Image storage uploads (parallel)", {
      count: files.length,
      uploadMs: upload.ok ? upload.uploadMs : undefined,
    });

    if (!upload.ok) {
      await prisma.listing.update({
        where: { id: listing.id },
        data: { deletedAt: new Date(), status: "ARCHIVED" },
      });
      timeline.mark("Rollback listing after failed upload");
      timeline.done("createListingAction");
      return {
        ok: false,
        error: { code: "INTERNAL", message: upload.message },
      };
    }

    await prisma.listingImage.createMany({
      data: upload.images.map((image) => ({
        listingId: listing.id,
        storagePath: image.storagePath,
        url: image.url,
        sortOrder: image.sortOrder,
        byteSize: image.byteSize,
      })),
    });
    timeline.mark("Image database writes");

    scheduleSellerListingRevalidation(timeline);
    timeline.done("createListingAction");
    return { ok: true, data: { id: listing.id } };
  } catch (error) {
    timeline.mark("Error");
    timeline.done("createListingAction");
    logger.error("createListingAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toListingActionError(error) };
  }
}

export async function updateListingAction(
  listingId: string,
  formData: FormData,
): Promise<ListingActionResult<SellerListingDetailView>> {
  const timeline = new ActionTimeline();

  try {
    timeline.mark("Action start");

    const { user, profile } = await requireUser();
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

    const payload = parseListingPayload(formData.get("payload"));
    timeline.mark("Validate payload");
    if (!payload.ok) {
      timeline.done("updateListingAction");
      return {
        ok: false,
        error: { code: "VALIDATION", message: payload.message },
      };
    }

    const keepRaw = formData.get("keepImageIds");
    let keepImageIds: string[] = [];
    if (typeof keepRaw === "string" && keepRaw.length > 0) {
      try {
        const parsed: unknown = JSON.parse(keepRaw);
        if (
          Array.isArray(parsed) &&
          parsed.every((item) => typeof item === "string")
        ) {
          keepImageIds = parsed;
        } else {
          timeline.done("updateListingAction");
          return {
            ok: false,
            error: { code: "VALIDATION", message: "Invalid image order." },
          };
        }
      } catch {
        timeline.done("updateListingAction");
        return {
          ok: false,
          error: { code: "VALIDATION", message: "Invalid image order." },
        };
      }
    }
    timeline.mark("Parse keepImageIds");

    const newFiles = collectImageFiles(formData);
    timeline.mark("Collect image files", {
      count: newFiles.length,
      totalBytes: newFiles.reduce((sum, file) => sum + file.size, 0),
    });

    for (const file of newFiles) {
      if (!isAllowedListingImageMime(file.type)) {
        timeline.done("updateListingAction");
        return {
          ok: false,
          error: {
            code: "VALIDATION",
            message: "Photos must be JPG, PNG, or WebP.",
          },
        };
      }
      if (file.size > LISTING_IMAGE_MAX_BYTES) {
        timeline.done("updateListingAction");
        return {
          ok: false,
          error: {
            code: "VALIDATION",
            message: "Each photo must be 5 MB or smaller.",
          },
        };
      }
    }
    timeline.mark("Validate new image files");

    const keptImages = existing.images
      .filter((image) => keepImageIds.includes(image.id))
      .sort((a, b) => keepImageIds.indexOf(a.id) - keepImageIds.indexOf(b.id));

    const totalImages = keptImages.length + newFiles.length;
    if (totalImages < LISTING_IMAGE_MIN) {
      timeline.done("updateListingAction");
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: `Keep at least ${LISTING_IMAGE_MIN} photo.`,
        },
      };
    }
    if (totalImages > LISTING_IMAGE_MAX) {
      timeline.done("updateListingAction");
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: `You can have up to ${LISTING_IMAGE_MAX} photos.`,
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
    timeline.mark("Reorder kept images (parallel batches)", {
      count: keptImages.length,
    });

    let uploadedCount = 0;

    if (newFiles.length > 0) {
      const upload = await uploadListingImages({
        userId: user.id,
        listingId,
        files: newFiles,
        startSortOrder: keptImages.length,
      });
      timeline.mark("Image storage uploads (parallel)", {
        count: newFiles.length,
        uploadMs: upload.ok ? upload.uploadMs : undefined,
      });

      if (!upload.ok) {
        timeline.done("updateListingAction");
        return {
          ok: false,
          error: { code: "INTERNAL", message: upload.message },
        };
      }

      uploadedCount = upload.images.length;
      await prisma.listingImage.createMany({
        data: upload.images.map((image) => ({
          listingId,
          storagePath: image.storagePath,
          url: image.url,
          sortOrder: image.sortOrder,
          byteSize: image.byteSize,
        })),
      });
      timeline.mark("Image database writes");
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

    logger.info("Listing updated", {
      listingId,
      kept: keptImages.length,
      uploaded: uploadedCount,
    });

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
