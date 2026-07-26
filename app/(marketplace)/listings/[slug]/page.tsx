import Link from "next/link";
import { notFound } from "next/navigation";
import { after } from "next/server";

import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { LazyListingMap } from "@/features/maps/components/lazy-listing-map";
import { getUnavailableDateHints } from "@/features/rentals";
import { RentNowControls } from "@/features/rentals/components/rent-now-controls";
import {
  getListingOriginCoords,
  getNearbyListings,
  getPublicListingBySlug,
  getRelatedListings,
  incrementListingViewCount,
  isListingWishlisted,
} from "@/features/search";
import { AvailabilityCalendar } from "@/features/search/components/availability-calendar";
import { MarketplaceErrorState } from "@/features/search/components/error-state";
import { ListingReportButton } from "@/features/search/components/listing-actions";
import { ListingGallery } from "@/features/search/components/listing-gallery";
import { ListingGrid } from "@/features/search/components/listing-grid";
import { RecentlyViewedTracker } from "@/features/search/components/recently-viewed-tracker";
import { SellerCard } from "@/features/search/components/seller-card";
import { ShareMenu } from "@/features/search/components/share-menu";
import {
  formatDeposit,
  formatRentPrice,
} from "@/features/search/services/format";
import { WishlistButton } from "@/features/wishlist/components/wishlist-button";
import { getCurrentProfile } from "@/lib/auth/guards";
import { withPerf } from "@/lib/perf";
import {
  breadcrumbSchema,
  JsonLd,
  listingProductSchema,
  organizationSchema,
  reviewSchema,
  websiteSchema,
} from "@/lib/seo/json-ld";
import { buildListingMetadata } from "@/lib/seo/listing-metadata";

type ListingDetailPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ListingDetailPageProps) {
  const { slug } = await params;
  const listing = await getPublicListingBySlug(slug);
  if (!listing) {
    return { title: "Listing" };
  }
  return buildListingMetadata({
    title: listing.title,
    description: listing.description,
    slug: listing.slug,
    city: listing.city,
    categoryName: listing.categoryName,
    rentPriceLabel: formatRentPrice(
      listing.rentPriceAmount,
      listing.currency,
      listing.rentPriceUnit,
    ),
    imageUrl: listing.images[0]?.url ?? null,
    imageAlt: listing.title,
  });
}

export default async function ListingDetailPage({
  params,
}: ListingDetailPageProps) {
  const { slug } = await params;
  const profile = await getCurrentProfile();

  try {
    // Raw fetch cached by slug; privacy mapping applies per viewer (owner vs public).
    const listingBase = await getPublicListingBySlug(slug, {
      viewerUserId: profile?.id ?? null,
    });
    if (!listingBase) {
      notFound();
    }

    const origin = await getListingOriginCoords(slug);

    const [isWishlisted, related, nearby, hints] = await withPerf(
      "listing.detail.extras",
      () =>
        Promise.all([
          profile
            ? isListingWishlisted(listingBase.id, profile.id)
            : Promise.resolve(false),
          getRelatedListings(
            listingBase.id,
            listingBase.categoryId,
            4,
            profile?.id ?? null,
          ),
          origin
            ? getNearbyListings({
                listingId: origin.id,
                lat: origin.lat,
                lng: origin.lng,
                radiusKm: 10,
                take: 4,
                wishlistUserId: profile?.id ?? null,
              })
            : Promise.resolve([]),
          getUnavailableDateHints(listingBase.id, listingBase.availability),
        ]),
    );

    const listing = { ...listingBase, isWishlisted };

    after(() => {
      void incrementListingViewCount(listing.id);
    });

    const isOwner = profile?.id === listing.sellerId;

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
    const listingUrl = `${baseUrl}/listings/${listing.slug}`;
    const productSchema = listingProductSchema({
      title: listing.title,
      description: listing.description,
      slug: listing.slug,
      imageUrl: listing.images[0]?.url,
      city: listing.city,
      price: listing.rentPriceAmount,
      currency: listing.currency,
      priceUnit:
        listing.rentPriceUnit === "DAY"
          ? "day"
          : listing.rentPriceUnit === "WEEK"
            ? "week"
            : "month",
      sellerName: listing.seller.displayName,
      rating: listing.seller.avgRating,
      ratingCount: listing.seller.ratingCount,
    });
    const sellerReviewSchema = reviewSchema({
      itemName: `${listing.seller.displayName} on SamaanX`,
      ratingValue: listing.seller.avgRating,
      reviewCount: listing.seller.ratingCount,
      url: listingUrl,
    });
    const structuredData = [
      organizationSchema(),
      websiteSchema(),
      breadcrumbSchema([
        { name: "Home", href: "/" },
        {
          name: listing.categoryName,
          href: `/categories/${listing.categorySlug}`,
        },
        { name: listing.title, href: `/listings/${listing.slug}` },
      ]),
      productSchema,
      ...(sellerReviewSchema ? [sellerReviewSchema] : []),
    ];

    return (
      <div className="mx-auto w-full max-w-6xl px-4 pt-6 pb-28 sm:px-6 sm:pt-8 lg:pb-12">
        <JsonLd data={structuredData} />
        <div className="mb-4">
          <BackButton fallbackHref={BACK_FALLBACKS.search} />
        </div>

        <div className="grid gap-8 lg:grid-cols-[1.35fr_1fr]">
          <div className="space-y-6">
            <ListingGallery images={listing.images} title={listing.title} />

            <section className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="text-muted-foreground text-sm">
                    <Link
                      href={`/categories/${listing.categorySlug}`}
                      className="text-brand-blue hover:underline"
                    >
                      {listing.categoryName}
                    </Link>
                  </p>
                  <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
                    {listing.title}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {listing.area}, {listing.city}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <WishlistButton
                    listingId={listing.id}
                    initialWishlisted={listing.isWishlisted}
                    isAuthenticated={Boolean(profile)}
                  />
                  <ShareMenu title={listing.title} slug={listing.slug} />
                  <ListingReportButton
                    listingId={listing.id}
                    listingTitle={listing.title}
                  />
                </div>
              </div>

              <p className="text-foreground/90 text-sm leading-relaxed whitespace-pre-wrap">
                {listing.description}
              </p>
            </section>

            <AvailabilityCalendar availability={listing.availability} />

            <section className="space-y-3">
              <h2 className="text-lg font-semibold tracking-tight">Location</h2>
              <p className="text-muted-foreground text-sm">
                {listing.area}, {listing.city}
                {listing.locationPrecision === "approximate"
                  ? " · approximate area"
                  : " · exact pickup"}
              </p>
              <LazyListingMap
                apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY ?? ""}
                lat={listing.lat}
                lng={listing.lng}
                precision={listing.locationPrecision}
                title={listing.title}
              />
            </section>

            <RecentlyViewedTracker
              listing={{
                id: listing.id,
                slug: listing.slug,
                title: listing.title,
                coverImageUrl: listing.images[0]?.url ?? null,
                city: listing.city,
                area: listing.area,
              }}
            />

            {nearby.length > 0 ? (
              <section className="space-y-4 pt-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  Nearby alternatives
                </h2>
                <ListingGrid
                  listings={nearby}
                  isAuthenticated={Boolean(profile)}
                />
              </section>
            ) : null}

            {related.length > 0 ? (
              <section className="space-y-4 pt-2">
                <h2 className="text-xl font-semibold tracking-tight">
                  Similar listings
                </h2>
                <ListingGrid
                  listings={related}
                  isAuthenticated={Boolean(profile)}
                />
              </section>
            ) : null}
          </div>

          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="border-border/80 bg-card rounded-2xl border p-5 shadow-[var(--rp-shadow-sm)]">
              <p className="text-2xl font-semibold tracking-tight">
                {formatRentPrice(
                  listing.rentPriceAmount,
                  listing.currency,
                  listing.rentPriceUnit,
                )}
              </p>
              <p className="text-muted-foreground mt-1 text-sm">
                {formatDeposit({
                  depositType: listing.depositType,
                  depositAmount: listing.depositAmount,
                  depositPercent: listing.depositPercent,
                  currency: listing.currency,
                })}
              </p>
              <RentNowControls
                listing={listing}
                hints={hints}
                isAuthenticated={Boolean(profile)}
                isOwner={isOwner}
              />
            </div>

            <SellerCard seller={listing.seller} />
          </div>
        </div>
      </div>
    );
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    return (
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <MarketplaceErrorState description="This listing could not be loaded." />
      </div>
    );
  }
}
