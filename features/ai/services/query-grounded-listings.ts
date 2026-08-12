import { buildPublicListingWhere } from "@/domain/search";
import type { MarketplaceSearchFilters } from "@/domain/search/types";
import type {
  AiListingGrounding,
  AiParsedIntent,
} from "@/features/ai/types/ai-chat";
import { prisma } from "@/lib/db/prisma";

const AI_LISTING_LIMIT = 8;

const listingSelect = {
  title: true,
  slug: true,
  description: true,
  rentPriceAmount: true,
  rentPriceUnit: true,
  currency: true,
  city: true,
  area: true,
  depositType: true,
  depositAmount: true,
  depositPercent: true,
  category: { select: { name: true } },
} as const;

type ListingRow = {
  title: string;
  slug: string;
  description: string;
  rentPriceAmount: { toString(): string };
  rentPriceUnit: string;
  currency: string;
  city: string;
  area: string;
  depositType: string;
  depositAmount: { toString(): string } | null;
  depositPercent: { toString(): string } | null;
  category: { name: string };
};

function defaultFilters(
  overrides: Partial<MarketplaceSearchFilters> = {},
): MarketplaceSearchFilters {
  return {
    q: "",
    categorySlug: null,
    city: null,
    area: null,
    priceMin: null,
    priceMax: null,
    rentUnit: null,
    depositType: null,
    ratingMin: null,
    availableFrom: null,
    availableTo: null,
    availableToday: false,
    verifiedSellerOnly: false,
    nearLat: null,
    nearLng: null,
    radiusKm: null,
    sort: "newest",
    page: 1,
    pageSize: AI_LISTING_LIMIT,
    ...overrides,
  };
}

function formatDepositNote(listing: ListingRow): string | null {
  if (listing.depositType === "NONE") return null;
  if (listing.depositType === "FIXED" && listing.depositAmount) {
    return `Deposit: Rs. ${Number(listing.depositAmount)}`;
  }
  if (listing.depositType === "PERCENTAGE" && listing.depositPercent) {
    return `Deposit: ${Number(listing.depositPercent)}%`;
  }
  return "Deposit required";
}

function formatPriceUnit(unit: string): string {
  switch (unit) {
    case "DAY":
      return "day";
    case "WEEK":
      return "week";
    case "MONTH":
      return "month";
    default:
      return unit.toLowerCase();
  }
}

function toGrounding(listing: ListingRow): AiListingGrounding {
  return {
    title: listing.title,
    slug: listing.slug,
    categoryName: listing.category.name,
    city: listing.city,
    area: listing.area,
    priceAmount: Number(listing.rentPriceAmount),
    priceUnit: listing.rentPriceUnit,
    currency: listing.currency,
    descriptionSnippet: listing.description.slice(0, 180).trim(),
    depositNote: formatDepositNote(listing),
  };
}

async function fetchListings(
  filters: MarketplaceSearchFilters,
): Promise<ListingRow[]> {
  const where = buildPublicListingWhere(filters);

  return prisma.listing.findMany({
    where,
    select: listingSelect,
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    take: AI_LISTING_LIMIT,
  }) as Promise<ListingRow[]>;
}

export async function queryGroundedListings(
  intent: AiParsedIntent,
): Promise<AiListingGrounding[]> {
  const attempts: MarketplaceSearchFilters[] = [];

  if (!intent.isGeneralQuestion) {
    attempts.push(
      defaultFilters({
        q: intent.keywords,
        categorySlug: intent.categorySlug,
        city: intent.city,
        priceMax: intent.priceMax,
        sort: intent.priceMax ? "price_asc" : "newest",
      }),
    );

    if (intent.priceMax) {
      attempts.push(
        defaultFilters({
          q: intent.keywords,
          categorySlug: intent.categorySlug,
          city: intent.city,
          sort: "price_asc",
        }),
      );
    }

    if (intent.keywords) {
      attempts.push(defaultFilters({ q: intent.keywords, sort: "newest" }));
    }
  }

  attempts.push(defaultFilters({ sort: "newest" }));

  const seen = new Set<string>();
  const results: AiListingGrounding[] = [];

  for (const filters of attempts) {
    const rows = await fetchListings(filters);
    for (const row of rows) {
      if (seen.has(row.slug)) continue;
      seen.add(row.slug);
      results.push(toGrounding(row));
      if (results.length >= AI_LISTING_LIMIT) {
        return results;
      }
    }
  }

  return results;
}

export function formatListingsContext(
  listings: AiListingGrounding[],
  intent: AiParsedIntent,
): string {
  if (listings.length === 0) {
    return "SAMAANX AVAILABLE LISTINGS:\n\nNo matching active listings were returned for this request.";
  }

  const lines = listings.map((listing, index) => {
    const unit = formatPriceUnit(listing.priceUnit);
    const parts = [
      `Listing ${index + 1}:`,
      `Title: ${listing.title}`,
      `Price: Rs. ${listing.priceAmount.toLocaleString("en-PK")}/${unit}`,
      `City: ${listing.city}`,
      `Area: ${listing.area}`,
      `Category: ${listing.categoryName}`,
      `Slug: ${listing.slug}`,
      `Summary: ${listing.descriptionSnippet}`,
    ];
    if (listing.depositNote) {
      parts.push(listing.depositNote);
    }
    return parts.join("\n");
  });

  const intentNotes: string[] = [];
  if (intent.priceMax) {
    intentNotes.push(`User budget hint: up to Rs. ${intent.priceMax}`);
  }
  if (intent.rentDays) {
    intentNotes.push(`User rental duration hint: ${intent.rentDays} day(s)`);
  }
  if (intent.city) {
    intentNotes.push(`User city hint: ${intent.city}`);
  }

  return [
    "SAMAANX AVAILABLE LISTINGS:",
    "These are the ONLY SamaanX listings you may recommend for this request.",
    ...intentNotes,
    "",
    ...lines,
  ].join("\n");
}
