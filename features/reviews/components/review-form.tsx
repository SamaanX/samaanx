"use client";

import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitReviewAction } from "@/features/reviews/actions/review-actions";
import type { ReviewEligibleRental } from "@/features/reviews/types/review";
import { StarRatingInput } from "@/features/trust/components/star-rating";
import { trackEvent } from "@/lib/analytics/events";

type ReviewFormProps = {
  eligibility: ReviewEligibleRental;
  onSubmitted?: () => void;
};

export function ReviewForm({ eligibility, onSubmitted }: ReviewFormProps) {
  const [rating, setRating] = React.useState(5);
  const [comment, setComment] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [done, setDone] = React.useState(eligibility.alreadyReviewed);
  const [error, setError] = React.useState<string | null>(null);

  if (done) {
    return (
      <div className="border-border/70 bg-muted/30 rounded-2xl border p-5 text-center">
        <p className="text-sm font-medium">Thanks for your review</p>
        <p className="text-muted-foreground mt-1 text-sm">
          You already reviewed {eligibility.revieweeName} for this rental.
        </p>
      </div>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    const result = await submitReviewAction({
      rentalId: eligibility.rentalId,
      rating,
      comment,
    });
    setPending(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    setDone(true);
    trackEvent("review_submitted", { rental_id: eligibility.rentalId });
    toast.success("Review submitted");
    onSubmitted?.();
  }

  return (
    <form
      onSubmit={(e) => void onSubmit(e)}
      className="border-border/70 bg-card rounded-2xl border p-5 shadow-[var(--rp-shadow-xs)]"
    >
      <h2 className="text-base font-semibold tracking-tight">
        Rate {eligibility.revieweeName}
      </h2>
      <p className="text-muted-foreground mt-1 text-sm">
        {eligibility.role === "buyer"
          ? "How was your experience with this seller?"
          : "How was your experience with this buyer?"}{" "}
        For “{eligibility.listingTitle}”.
      </p>

      <div className="mt-4">
        <StarRatingInput
          value={rating}
          onChange={setRating}
          disabled={pending}
        />
      </div>

      <div className="mt-4 space-y-1.5">
        <Label htmlFor="review-comment">Written review (optional)</Label>
        <Textarea
          id="review-comment"
          rows={4}
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share what went well or what could improve…"
          maxLength={2000}
          disabled={pending}
        />
      </div>

      {error ? (
        <p role="alert" className="text-destructive mt-3 text-sm">
          {error}
        </p>
      ) : null}

      <Button
        type="submit"
        className="mt-4 w-full sm:w-auto"
        disabled={pending}
      >
        {pending ? "Submitting…" : "Submit review"}
      </Button>
    </form>
  );
}
