"use server";

import type { ListingModerationStatus, ListingStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { adminListingModerationSchema } from "@/features/admin/schemas/admin-schemas";
import { writeAdminActionLog } from "@/features/admin/services/audit-log";
import { hasAdminPermission } from "@/features/admin/services/permissions";
import type { AdminActionResult } from "@/features/admin/types/admin";
import { requireAdmin } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";

async function moderateListing(
  listingId: string,
  data: {
    moderationStatus: ListingModerationStatus;
    moderationReason: string;
    status?: ListingStatus;
  },
  actorId: string,
  reason: string,
  previous: {
    moderationStatus: ListingModerationStatus;
    status: ListingStatus;
  },
): Promise<void> {
  await prisma.listing.update({
    where: { id: listingId },
    data: {
      moderationStatus: data.moderationStatus,
      moderationReason: data.moderationReason,
      moderatedById: actorId,
      moderatedAt: new Date(),
      ...(data.status ? { status: data.status } : {}),
    },
  });

  await writeAdminActionLog({
    actorId,
    entityType: "listing",
    entityId: listingId,
    reason,
    previousValue: previous,
    newValue: data,
  });
}

export async function approveListingAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    if (!hasAdminPermission(profile.role, "listings.moderate")) {
      return {
        ok: false,
        error: { code: "FORBIDDEN", message: "No permission." },
      };
    }

    const parsed = adminListingModerationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data.listingId },
      select: { moderationStatus: true, status: true },
    });
    if (!listing) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Listing not found." },
      };
    }

    await moderateListing(
      parsed.data.listingId,
      {
        moderationStatus: "APPROVED",
        moderationReason: parsed.data.reason,
        status: listing.status === "DRAFT" ? "ACTIVE" : listing.status,
      },
      profile.id,
      parsed.data.reason,
      listing,
    );

    revalidatePath("/admin/listings");
    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not approve listing." },
    };
  }
}

export async function rejectListingAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    const parsed = adminListingModerationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data.listingId },
      select: { moderationStatus: true, status: true },
    });
    if (!listing) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Listing not found." },
      };
    }

    await moderateListing(
      parsed.data.listingId,
      {
        moderationStatus: "REJECTED",
        moderationReason: parsed.data.reason,
        status: "ARCHIVED",
      },
      profile.id,
      parsed.data.reason,
      listing,
    );

    revalidatePath("/admin/listings");
    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not reject listing." },
    };
  }
}

export async function hideListingAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    const parsed = adminListingModerationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data.listingId },
      select: { moderationStatus: true, status: true },
    });
    if (!listing) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Listing not found." },
      };
    }

    await moderateListing(
      parsed.data.listingId,
      {
        moderationStatus: "HIDDEN",
        moderationReason: parsed.data.reason,
        status: "PAUSED",
      },
      profile.id,
      parsed.data.reason,
      listing,
    );

    revalidatePath("/admin/listings");
    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not hide listing." },
    };
  }
}

export async function restoreListingAction(
  input: unknown,
): Promise<AdminActionResult> {
  try {
    const { profile } = await requireAdmin();
    const parsed = adminListingModerationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: {
          code: "VALIDATION",
          message: parsed.error.issues[0]?.message ?? "Invalid.",
        },
      };
    }

    const listing = await prisma.listing.findUnique({
      where: { id: parsed.data.listingId },
      select: { moderationStatus: true, status: true },
    });
    if (!listing) {
      return {
        ok: false,
        error: { code: "NOT_FOUND", message: "Listing not found." },
      };
    }

    await moderateListing(
      parsed.data.listingId,
      {
        moderationStatus: "APPROVED",
        moderationReason: parsed.data.reason,
        status: "ACTIVE",
      },
      profile.id,
      parsed.data.reason,
      listing,
    );

    revalidatePath("/admin/listings");
    return { ok: true, data: undefined };
  } catch {
    return {
      ok: false,
      error: { code: "INTERNAL", message: "Could not restore listing." },
    };
  }
}
