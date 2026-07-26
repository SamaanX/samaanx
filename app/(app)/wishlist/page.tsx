import { redirect } from "next/navigation";

import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { WishlistPageClient } from "@/features/wishlist/components/wishlist-page-client";
import { getWishlistListings } from "@/features/wishlist/queries/wishlist";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";
import { withPerf } from "@/lib/perf";

export const metadata = {
  title: "Wishlist",
  description: "Saved listings on SamaanX.",
};

export default async function WishlistPage() {
  try {
    const { profile } = await requireUser();
    const items = await withPerf("route.wishlist", () =>
      getWishlistListings(profile.id),
    );

    return (
      <div className="mx-auto w-full max-w-6xl px-4 pt-4 pb-16 sm:px-6 sm:pt-6">
        <header className="mb-6 space-y-2">
          <BackButton fallbackHref={BACK_FALLBACKS.wishlist} />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Wishlist
          </h1>
          <p className="text-muted-foreground text-sm">
            {items.length > 0
              ? `${items.length} saved listing${items.length === 1 ? "" : "s"}`
              : "Heart listings while browsing to save them here."}
          </p>
        </header>

        <WishlistPageClient initialItems={items} />
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect("/login?next=/wishlist");
    }
    throw error;
  }
}
