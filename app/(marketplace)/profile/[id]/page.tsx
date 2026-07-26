import type { RentPriceUnit } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";

import { PublicProfileHero } from "@/features/reviews/components/public-profile-hero";
import { ReviewCard } from "@/features/reviews/components/review-card";
import { getPublicProfileById } from "@/features/reviews/queries/reviews";
import { formatRentPrice } from "@/features/search/services/format";
import { RatingBreakdownPanel } from "@/features/trust/components/rating-breakdown";
import { getCurrentProfile } from "@/lib/auth/guards";

type PublicProfilePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: PublicProfilePageProps) {
  const { id } = await params;
  const profile = await getPublicProfileById(id);
  if (!profile) {
    return { title: "Profile" };
  }
  return {
    title: `${profile.displayName} · Trust profile`,
    description:
      profile.bio?.slice(0, 140) ||
      `View ${profile.displayName}'s ratings, reviews, and listings on SamaanX.`,
  };
}

export default async function PublicProfilePage({
  params,
}: PublicProfilePageProps) {
  const { id } = await params;
  const [profile, viewer] = await Promise.all([
    getPublicProfileById(id),
    getCurrentProfile(),
  ]);

  if (!profile) notFound();

  const viewerId = viewer?.id ?? null;
  const isOwn = viewerId === profile.id;

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-4 py-6 sm:px-6 sm:py-8">
      <PublicProfileHero profile={profile} isOwn={isOwn} viewerId={viewerId} />

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <section aria-labelledby="reviews-heading" className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <h2
                id="reviews-heading"
                className="text-lg font-semibold tracking-tight"
              >
                Reviews
              </h2>
              <p className="text-muted-foreground text-sm">Newest first</p>
            </div>
            {profile.reviews.length === 0 ? (
              <div className="border-border/80 bg-muted/20 rounded-2xl border border-dashed px-5 py-10 text-center">
                <p className="text-sm font-medium">No reviews yet</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  Completed rentals will unlock community feedback here.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {profile.reviews.map((review) => (
                  <li key={review.id}>
                    <ReviewCard review={review} showReport={!isOwn} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section
            id="active-listings"
            aria-labelledby="listings-heading"
            className="scroll-mt-24 space-y-4"
          >
            <h2
              id="listings-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Active listings
            </h2>
            {profile.activeListings.length === 0 ? (
              <div className="border-border/80 bg-muted/20 rounded-2xl border border-dashed px-5 py-10 text-center">
                <p className="text-sm font-medium">No active listings</p>
                <p className="text-muted-foreground mt-1 text-sm">
                  When this member publishes items, they will appear here.
                </p>
              </div>
            ) : (
              <ul className="grid gap-3 sm:grid-cols-2">
                {profile.activeListings.map((listing) => (
                  <li key={listing.id}>
                    <Link
                      href={`/listings/${listing.slug}`}
                      className="border-border/70 bg-card hover:border-brand-blue/30 hover:bg-brand-blue-soft/30 focus-visible:ring-ring flex gap-3 rounded-2xl border p-3 shadow-[var(--rp-shadow-xs)] transition-colors focus-visible:ring-2 focus-visible:outline-none"
                    >
                      <div className="bg-muted relative size-16 shrink-0 overflow-hidden rounded-xl">
                        {listing.coverImageUrl ? (
                          <Image
                            src={listing.coverImageUrl}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          {listing.title}
                        </p>
                        <p className="text-muted-foreground mt-0.5 truncate text-xs">
                          {listing.area}, {listing.city}
                        </p>
                        <p className="text-brand-blue mt-1 text-sm font-medium">
                          {formatRentPrice(
                            listing.rentPriceAmount,
                            listing.currency,
                            listing.rentPriceUnit as RentPriceUnit,
                          )}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <RatingBreakdownPanel breakdown={profile.ratingBreakdown} />
        </aside>
      </div>
    </div>
  );
}
