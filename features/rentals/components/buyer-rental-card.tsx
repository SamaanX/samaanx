"use client";

import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { afterLiveMutation } from "@/features/realtime/live-sync";
import { cancelRentalRequestAction } from "@/features/rentals/actions";
import { RentalStatusBadge } from "@/features/rentals/components/rental-status-badge";
import { RentalTimeline } from "@/features/rentals/components/rental-timeline";
import { ReturnItemButton } from "@/features/rentals/components/return-item-button";
import { applyOptimisticRentalStatus } from "@/features/rentals/lib/optimistic-rental-groups";
import {
  formatCreatedAt,
  formatRentalDates,
  formatRentalMoney,
} from "@/features/rentals/services/format";
import type {
  BuyerRentalsGrouped,
  RentalCardView,
} from "@/features/rentals/types/rental";
import { queryKeys } from "@/lib/query-keys";

type BuyerRentalCardProps = {
  rental: RentalCardView;
};

export function BuyerRentalCard({ rental }: BuyerRentalCardProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onCancel() {
    setError(null);
    setBusy(true);
    queryClient.setQueryData<BuyerRentalsGrouped>(
      queryKeys.rentals.buyer(),
      (prev) =>
        prev ? applyOptimisticRentalStatus(prev, rental.id, "CANCELLED") : prev,
    );
    const result = await cancelRentalRequestAction({ rentalId: rental.id });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.rentals.buyer(),
      });
      return;
    }
    afterLiveMutation(queryClient, [rental.seller.id], {
      rentalId: rental.id,
    });
  }

  const canCancel =
    rental.status === "REQUESTED" ||
    rental.status === "APPROVED" ||
    rental.status === "HANDOVER_PENDING";

  const showHandover =
    rental.status === "APPROVED" || rental.status === "HANDOVER_PENDING";
  const canRequestReturn = rental.status === "ACTIVE";
  const showContinueReturn = rental.status === "RETURN_PENDING";

  return (
    <article className="border-border/80 bg-card overflow-hidden rounded-2xl border shadow-[var(--rp-shadow-sm)]">
      <div className="flex gap-3 p-4">
        <Link
          href={`/listings/${rental.listing.slug}`}
          className="bg-muted relative size-20 shrink-0 overflow-hidden rounded-xl sm:size-24"
        >
          {rental.listing.coverImageUrl ? (
            <Image
              src={rental.listing.coverImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="96px"
            />
          ) : (
            <span className="text-muted-foreground flex size-full items-center justify-center text-xs">
              No photo
            </span>
          )}
        </Link>

        <div className="min-w-0 flex-1 space-y-1.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link
                href={`/listings/${rental.listing.slug}`}
                className="line-clamp-2 text-sm font-semibold tracking-tight hover:underline sm:text-base"
              >
                {rental.listing.title}
              </Link>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Seller ·{" "}
                <Link
                  href={`/profile/${rental.seller.id}`}
                  className="text-foreground font-medium underline-offset-2 hover:underline"
                >
                  {rental.seller.displayName}
                </Link>{" "}
                · {rental.listing.city}
              </p>
            </div>
            <RentalStatusBadge status={rental.status} />
          </div>

          <p className="text-sm">{formatRentalDates(rental)}</p>
          <p className="text-sm font-medium">
            {formatRentalMoney(rental.estimatedRent, rental.currency)} rent
            {rental.estimatedDeposit > 0
              ? ` · ${formatRentalMoney(rental.estimatedDeposit, rental.currency)} deposit`
              : ""}
          </p>
          <p className="text-muted-foreground text-xs">{rental.currentStep}</p>
          <RentalTimeline status={rental.status} className="pt-1" />
          <p className="text-muted-foreground text-xs">
            Requested {formatCreatedAt(rental.createdAt)}
          </p>
        </div>
      </div>

      <div className="border-border/70 flex flex-wrap gap-2 border-t px-4 py-3">
        {rental.conversationId ? (
          <Link
            href={`/chat/${rental.conversationId}`}
            className="border-border bg-background hover:bg-muted inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-[0.8rem] font-medium"
          >
            <MessageCircle className="text-brand-blue size-3.5" aria-hidden />
            Open Chat
          </Link>
        ) : null}

        {showHandover ? (
          <Link
            href={`/rentals/${rental.id}/handover`}
            className="bg-brand-gradient inline-flex h-9 items-center rounded-lg px-3 text-[0.8rem] font-medium text-white shadow-[var(--rp-shadow-xs)]"
          >
            Handover verify
          </Link>
        ) : null}

        {canRequestReturn ? (
          <ReturnItemButton
            rentalId={rental.id}
            peerUserId={rental.seller.id}
          />
        ) : null}

        {showContinueReturn ? (
          <Link
            href={`/rentals/${rental.id}/return`}
            className="bg-brand-gradient inline-flex h-9 items-center rounded-lg px-3 text-[0.8rem] font-medium text-white shadow-[var(--rp-shadow-xs)]"
          >
            Continue return
          </Link>
        ) : null}

        {rental.status === "COMPLETED" ? (
          <Link
            href={`/rentals/${rental.id}/review`}
            className="border-brand-blue/30 bg-brand-blue-soft text-brand-blue hover:bg-brand-blue-soft/80 inline-flex h-9 items-center rounded-lg border px-3 text-[0.8rem] font-medium"
          >
            Leave review
          </Link>
        ) : null}

        {canCancel ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-9"
            disabled={busy}
            onClick={() => void onCancel()}
          >
            Cancel request
          </Button>
        ) : null}
      </div>

      {error ? (
        <p
          className="border-border/70 text-destructive border-t px-4 py-2 text-sm"
          role="alert"
        >
          {error}
        </p>
      ) : null}

      {rental.rejectionReason ? (
        <p className="border-border/70 text-muted-foreground border-t px-4 py-2 text-sm">
          Reason: {rental.rejectionReason}
        </p>
      ) : null}
    </article>
  );
}
