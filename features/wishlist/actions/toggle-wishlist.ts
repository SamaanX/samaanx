"use server";

import { requireUser } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/prisma";
import { AppError } from "@/lib/errors/app-error";

export type WishlistToggleResult =
  | { ok: true; wishlisted: boolean }
  | {
      ok: false;
      error: string;
      code: "UNAUTHORIZED" | "NOT_FOUND" | "INTERNAL";
    };

/** Heart toggle is optimistic on the client — no revalidatePath. */
export async function toggleWishlistAction(
  listingId: string,
): Promise<WishlistToggleResult> {
  try {
    const { profile } = await requireUser();

    const listing = await prisma.listing.findFirst({
      where: {
        id: listingId,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true },
    });

    if (!listing) {
      return { ok: false, error: "Listing not found.", code: "NOT_FOUND" };
    }

    const existing = await prisma.wishlist.findUnique({
      where: {
        userId_listingId: {
          userId: profile.id,
          listingId: listing.id,
        },
      },
    });

    if (existing) {
      await prisma.wishlist.delete({ where: { id: existing.id } });
      return { ok: true, wishlisted: false };
    }

    await prisma.wishlist.create({
      data: {
        userId: profile.id,
        listingId: listing.id,
      },
    });

    return { ok: true, wishlisted: true };
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      return {
        ok: false,
        error: "Sign in to save listings.",
        code: "UNAUTHORIZED",
      };
    }
    return {
      ok: false,
      error: "Could not update wishlist.",
      code: "INTERNAL",
    };
  }
}
