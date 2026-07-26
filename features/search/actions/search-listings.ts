"use server";

import { parseMarketplaceSearchParams } from "@/domain/search";
import { searchPublicListings } from "@/features/search/queries/catalog";
import type { SearchListingsResult } from "@/features/search/types/marketplace";
import { getCurrentProfile } from "@/lib/auth/guards";
import { withPerf } from "@/lib/perf";

/** Client load-more / infinite scroll — one page per call. */
export async function searchListingsPageAction(
  params: Record<string, string | string[] | undefined>,
): Promise<SearchListingsResult> {
  return withPerf("action.search.page", async () => {
    const filters = parseMarketplaceSearchParams(params);
    const profile = await getCurrentProfile();
    return searchPublicListings(filters, profile?.id ?? null);
  });
}
