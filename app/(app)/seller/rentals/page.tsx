import { redirect } from "next/navigation";

import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { getSellerRentals } from "@/features/rentals";
import { RentalPriorityDashboard } from "@/features/rentals/components/rental-priority-dashboard";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";
import { withPerf } from "@/lib/perf";

export const metadata = {
  title: "Rental requests",
  description: "Manage incoming rental requests for your listings.",
};

export default async function SellerRentalsPage() {
  try {
    const { profile } = await requireUser();
    const groups = await withPerf("route.rentals.seller", () =>
      getSellerRentals(profile.id),
    );

    return (
      <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6 sm:pt-6">
        <header className="mb-6 space-y-2">
          <BackButton fallbackHref={BACK_FALLBACKS.sellerRentals} />
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Rental activity
          </h1>
          <p className="text-muted-foreground text-sm">
            New requests and returns show at the top so nothing gets missed.
          </p>
        </header>

        <RentalPriorityDashboard
          mode="seller"
          userId={profile.id}
          groups={groups}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect("/login?next=/seller/rentals");
    }
    throw error;
  }
}
