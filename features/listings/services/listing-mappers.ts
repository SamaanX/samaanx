import type {
  Category,
  Listing,
  ListingAvailability,
  ListingImage,
} from "@prisma/client";

import type {
  CategoryOption,
  SellerListingCardView,
  SellerListingDetailView,
} from "@/features/listings/types/listing";

type ListingWithCover = {
  id: string;
  title: string;
  status: Listing["status"];
  rentPriceAmount: Listing["rentPriceAmount"];
  rentPriceUnit: Listing["rentPriceUnit"];
  currency: string;
  city: string;
  area: string;
  viewCount: number;
  requestCount: number;
  createdAt: Date;
  publishedAt: Date | null;
  category: Pick<Category, "name">;
  images: Pick<ListingImage, "url" | "sortOrder">[];
};

type ListingDetail = Listing & {
  images: ListingImage[];
  availability: ListingAvailability[];
  showExactPickup?: boolean;
};

function toDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function toCategoryOption(category: Category): CategoryOption {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    sortOrder: category.sortOrder,
  };
}

export function toSellerListingCardView(
  listing: ListingWithCover,
): SellerListingCardView {
  const cover = [...listing.images].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )[0];

  return {
    id: listing.id,
    title: listing.title,
    status: listing.status,
    rentPriceAmount: Number(listing.rentPriceAmount),
    rentPriceUnit: listing.rentPriceUnit,
    currency: listing.currency,
    city: listing.city,
    area: listing.area,
    viewCount: listing.viewCount,
    requestCount: listing.requestCount,
    createdAt: listing.createdAt.toISOString(),
    publishedAt: listing.publishedAt?.toISOString() ?? null,
    categoryName: listing.category.name,
    coverImageUrl: cover?.url ?? null,
  };
}

export function toSellerListingDetailView(
  listing: ListingDetail,
): SellerListingDetailView {
  return {
    id: listing.id,
    title: listing.title,
    description: listing.description,
    status: listing.status,
    categoryId: listing.categoryId,
    rentPriceAmount: Number(listing.rentPriceAmount),
    rentPriceUnit: listing.rentPriceUnit,
    currency: listing.currency,
    depositType: listing.depositType,
    depositAmount:
      listing.depositAmount === null ? null : Number(listing.depositAmount),
    depositPercent:
      listing.depositPercent === null ? null : Number(listing.depositPercent),
    city: listing.city,
    area: listing.area,
    countryCode: listing.countryCode,
    lat: listing.lat,
    lng: listing.lng,
    showExactPickup: Boolean(listing.showExactPickup),
    viewCount: listing.viewCount,
    requestCount: listing.requestCount,
    createdAt: listing.createdAt.toISOString(),
    publishedAt: listing.publishedAt?.toISOString() ?? null,
    images: [...listing.images]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((image) => ({
        id: image.id,
        storagePath: image.storagePath,
        url: image.url,
        sortOrder: image.sortOrder,
        byteSize: image.byteSize,
      })),
    availability: [...listing.availability]
      .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())
      .map((row) => ({
        id: row.id,
        type: row.type,
        startDate: toDateOnly(row.startDate),
        endDate: toDateOnly(row.endDate),
        notes: row.notes,
      })),
  };
}
