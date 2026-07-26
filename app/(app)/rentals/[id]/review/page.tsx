import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { buttonVariants } from "@/components/ui/button";
import { ReviewForm } from "@/features/reviews/components/review-form";
import { getReviewEligibilityForRental } from "@/features/reviews/queries/reviews";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";
import { cn } from "@/lib/utils";

type ReviewPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Leave a review",
  description: "Rate your completed rental experience on SamaanX.",
};

export default async function RentalReviewPage({ params }: ReviewPageProps) {
  const { id } = await params;

  try {
    const { profile } = await requireUser();
    const eligibility = await getReviewEligibilityForRental(id, profile.id);
    if (!eligibility) {
      notFound();
    }

    return (
      <div className="mx-auto max-w-lg space-y-6 px-4 py-8 sm:px-6">
        <div>
          <Link
            href="/rentals"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "mb-2 -ml-2",
            )}
          >
            Back to rentals
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">
            Leave a review
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Honest feedback builds trust across the SamaanX community.
          </p>
        </div>

        <ReviewForm eligibility={eligibility} />

        <p className="text-muted-foreground text-center text-sm">
          View {eligibility.revieweeName}&apos;s{" "}
          <Link
            href={`/profile/${eligibility.revieweeId}`}
            className="text-brand-blue font-medium underline-offset-4 hover:underline"
          >
            trust profile
          </Link>
          .
        </p>
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect(`/login?next=/rentals/${id}/review`);
    }
    throw error;
  }
}
