"use server";

import {
  getSellerListingsPage,
  SELLER_LISTINGS_PAGE_SIZE,
} from "@/features/listings/queries/categories";
import type { SellerListingCardView } from "@/features/listings/types/listing";
import { requireUser } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export async function getSellerListingsAction(cursor?: string | null): Promise<
  | {
      ok: true;
      data: {
        listings: SellerListingCardView[];
        nextCursor: string | null;
      };
    }
  | { ok: false; error: { message: string } }
> {
  try {
    const { profile } = await requireUser();
    const data = await getSellerListingsPage(profile.id, { cursor });
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

export { SELLER_LISTINGS_PAGE_SIZE };
