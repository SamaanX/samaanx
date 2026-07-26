"use server";

import { getSellerListings } from "@/features/listings/queries/categories";
import type { SellerListingCardView } from "@/features/listings/types/listing";
import { requireUser } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export async function getSellerListingsAction(): Promise<
  | { ok: true; data: SellerListingCardView[] }
  | { ok: false; error: { message: string } }
> {
  try {
    const { profile } = await requireUser();
    const data = await getSellerListings(profile.id);
    return { ok: true, data };
  } catch (error) {
    logger.error("getSellerListingsAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return {
      ok: false,
      error: { message: "Could not load listings." },
    };
  }
}
