"use client";

import * as React from "react";

import {
  type MarketingPlacement,
  resolveActivePromoBanners,
} from "@/features/marketing/types/marketing";

type PromoBannerSlotProps = {
  placement: MarketingPlacement;
};

/** Renders active promo banners when campaigns exist — hidden today. */
export function PromoBannerSlot({ placement }: PromoBannerSlotProps) {
  const banners = React.useMemo(
    () => resolveActivePromoBanners(placement),
    [placement],
  );

  if (banners.length === 0) return null;

  return (
    <div className="space-y-2" aria-label="Promotions">
      {banners.map((banner) => (
        <div
          key={banner.id}
          className="border-brand-blue/20 bg-brand-blue-soft/30 rounded-2xl border px-4 py-3"
        >
          <p className="text-sm font-semibold">{banner.title}</p>
          <p className="text-muted-foreground text-xs">{banner.body}</p>
        </div>
      ))}
    </div>
  );
}
