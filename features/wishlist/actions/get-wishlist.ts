"use server";

import type { PublicListingCardView } from "@/features/search/types/marketplace";
import {
  getWishlistListings,
  type WishlistSort,
} from "@/features/wishlist/queries/wishlist";
import { getCurrentProfile } from "@/lib/auth/guards";

export async function getWishlistListingsAction(input?: {
  q?: string;
  sort?: WishlistSort;
}): Promise<
  { ok: true; data: PublicListingCardView[] } | { ok: false; error: string }
> {
  const profile = await getCurrentProfile();
  if (!profile) {
    return { ok: false, error: "Unauthorized" };
  }
  const data = await getWishlistListings(profile.id, {
    q: input?.q,
    sort: input?.sort,
  });
  return { ok: true, data };
}
