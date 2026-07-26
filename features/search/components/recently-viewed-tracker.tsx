"use client";

import * as React from "react";

import {
  pushRecentlyViewed,
  type RecentlyViewedItem,
} from "@/features/search/lib/recently-viewed";

type RecentlyViewedTrackerProps = {
  listing: Omit<RecentlyViewedItem, "viewedAt">;
};

/** Records a view in localStorage once per mount — zero server cost. */
export function RecentlyViewedTracker({ listing }: RecentlyViewedTrackerProps) {
  React.useEffect(() => {
    pushRecentlyViewed(listing);
    // Only re-record when the listing identity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.id]);

  return null;
}
