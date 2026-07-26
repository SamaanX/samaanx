import { notFound, redirect } from "next/navigation";

import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { ListingForm } from "@/features/listings/components/listing-form";
import {
  getActiveCategories,
  getSellerListingDetail,
} from "@/features/listings/queries/categories";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";

type EditListingPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: EditListingPageProps) {
  const { id } = await params;
  return {
    title: "Edit listing",
    description: `Edit listing ${id}`,
  };
}

export default async function EditListingPage({
  params,
}: EditListingPageProps) {
  const { id } = await params;

  let profileId: string;
  try {
    const { profile } = await requireUser();
    profileId = profile.id;
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect(`/login?next=/seller/listings/${id}/edit`);
    }
    throw error;
  }

  const [categories, listing] = await Promise.all([
    getActiveCategories(),
    getSellerListingDetail(id, profileId),
  ]);

  if (!listing) {
    notFound();
  }

  return (
    <div className="mx-auto w-full max-w-lg px-4 pb-16 sm:px-6">
      <header className="border-border/60 bg-background/85 sticky top-0 z-20 -mx-4 mb-6 space-y-2 border-b px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 backdrop-blur-md sm:-mx-6 sm:px-6">
        <BackButton fallbackHref={BACK_FALLBACKS.sellerListings} />
        <h1 className="text-2xl font-semibold tracking-tight">Edit listing</h1>
        <p className="text-muted-foreground text-sm">{listing.title}</p>
      </header>

      <ListingForm mode="edit" categories={categories} listing={listing} />
    </div>
  );
}
