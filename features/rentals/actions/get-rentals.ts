"use server";

import {
  getBuyerRentals,
  getSellerRentals,
} from "@/features/rentals/queries/rentals";
import { toRentalActionError } from "@/features/rentals/services/rental-errors";
import type {
  BuyerRentalsGrouped,
  RentalActionResult,
  SellerRentalsGrouped,
} from "@/features/rentals/types/rental";
import { requireUser } from "@/lib/auth/guards";
import { logger } from "@/lib/logger";

export async function getBuyerRentalsAction(): Promise<
  RentalActionResult<BuyerRentalsGrouped>
> {
  try {
    const { profile } = await requireUser();
    const data = await getBuyerRentals(profile.id);
    return { ok: true, data };
  } catch (error) {
    logger.error("getBuyerRentalsAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toRentalActionError(error) };
  }
}

export async function getSellerRentalsAction(): Promise<
  RentalActionResult<SellerRentalsGrouped>
> {
  try {
    const { profile } = await requireUser();
    const data = await getSellerRentals(profile.id);
    return { ok: true, data };
  } catch (error) {
    logger.error("getSellerRentalsAction failed", {
      message: error instanceof Error ? error.message : "unknown_error",
    });
    return { ok: false, error: toRentalActionError(error) };
  }
}
