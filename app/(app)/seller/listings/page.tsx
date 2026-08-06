import Link from "next/link";
import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { SellerListingsPanel } from "@/features/listings/components/seller-listings-panel";
import { getSellerListings } from "@/features/listings/queries/categories";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";
import { withPerf } from "@/lib/perf";

export const metadata = {
  title: "My listings",
  description: "Manage your SamaanX seller listings.",
};

function ListingsSkeleton() {
  return (
    <div className="space-y-3">
      <div className="bg-muted h-28 animate-pulse rounded-2xl" />
      <div className="bg-muted h-28 animate-pulse rounded-2xl" />
      <div className="bg-muted h-28 animate-pulse rounded-2xl" />
    </div>
  );
}

async function SellerListingsContent({ profileId }: { profileId: string }) {
  const listings = await withPerf("route.seller.listings", () =>
    getSellerListings(profileId),
  );

  return <SellerListingsPanel initial={listings} />;
}

export default async function SellerListingsPage() {
  let profileId: string;
  try {
    const { profile } = await requireUser();
    profileId = profile.id;
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect("/login?next=/seller/listings");
    }
    throw error;
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pb-16 sm:px-6">
      <header className="border-border/60 bg-background/85 sticky top-0 z-20 -mx-4 mb-6 space-y-3 border-b px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <BackButton fallbackHref={BACK_FALLBACKS.sellerDashboard} />
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">My listings</h1>
          <Link
            href="/seller/listings/new"
            className="bg-brand-gradient inline-flex h-11 shrink-0 items-center rounded-xl px-4 text-sm font-medium text-white shadow-[var(--rp-shadow-sm)] transition-transform hover:-translate-y-px"
          >
            New listing
          </Link>
        </div>
      </header>

      <Suspense fallback={<ListingsSkeleton />}>
        <SellerListingsContent profileId={profileId} />
      </Suspense>
    </div>
  );
}
