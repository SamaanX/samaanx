/**
 * Future-ready marketing architecture — no runtime business logic yet.
 * Wire campaigns via admin when ready without changing rental flows.
 */

export type MarketingPlacement =
  "home_hero" | "search_top" | "listing_sidebar" | "category_banner";

export type FeaturedListingSlot = {
  listingId: string;
  placement: MarketingPlacement;
  priority: number;
  startsAt: string;
  endsAt: string | null;
};

export type SponsoredListingSlot = FeaturedListingSlot & {
  sponsorLabel?: string;
  cpcBid?: number;
};

export type PromoBanner = {
  id: string;
  placement: MarketingPlacement;
  title: string;
  body: string;
  ctaLabel: string;
  ctaHref: string;
  dismissible: boolean;
  startsAt: string;
  endsAt: string | null;
};

export type CouponDefinition = {
  code: string;
  discountType: "PERCENT" | "FIXED";
  discountValue: number;
  maxUses: number | null;
  validFrom: string;
  validUntil: string | null;
  /** Future: restrict to category or first rental */
  scope?: "PLATFORM" | "CATEGORY" | "FIRST_RENTAL";
};

export type ReferralProfile = {
  code: string;
  inviterUserId: string;
  rewardType: "CREDIT" | "FEE_WAIVER";
  rewardValue: number;
};

export type PremiumSellerTier = {
  userId: string;
  tier: "PRO" | "ENTERPRISE";
  badgeLabel: string;
  featuredBoost: number;
  expiresAt: string | null;
};

/** Placeholder resolver — returns empty until admin campaigns ship. */
export function resolveActivePromoBanners(
  _placement: MarketingPlacement,
): PromoBanner[] {
  return [];
}

export function resolveFeaturedListings(
  _placement: MarketingPlacement,
): FeaturedListingSlot[] {
  return [];
}
