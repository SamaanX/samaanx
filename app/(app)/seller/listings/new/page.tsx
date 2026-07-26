import { redirect } from "next/navigation";

import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { ListingForm } from "@/features/listings/components/listing-form";
import { getActiveCategories } from "@/features/listings/queries/categories";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";

export const metadata = {
  title: "New listing",
  description: "Create a new SamaanX listing.",
};

export default async function NewListingPage() {
  let profile: Awaited<ReturnType<typeof requireUser>>["profile"];
  try {
    ({ profile } = await requireUser());
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect("/login?next=/seller/listings/new");
    }
    throw error;
  }

  const categories = await getActiveCategories();

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-16 sm:px-6">
      <header className="border-border/60 bg-background/85 sticky top-0 z-20 -mx-4 mb-6 space-y-2 border-b px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <BackButton fallbackHref={BACK_FALLBACKS.sellerListings} />
        <h1 className="text-2xl font-semibold tracking-tight">
          Create listing
        </h1>
        <p className="text-muted-foreground text-sm">
          Add photos, pricing, and availability for your item.
        </p>
      </header>

      <ListingForm
        mode="create"
        categories={categories}
        defaultCity={profile.city}
        defaultArea={profile.area}
        defaultLat={profile.lat}
        defaultLng={profile.lng}
      />
    </div>
  );
}
