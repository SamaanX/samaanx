"use client";

import type { RentalStatus } from "@prisma/client";
import { useQueryClient } from "@tanstack/react-query";
import { MessageCircle } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { afterLiveMutation } from "@/features/realtime/live-sync";
import {
  approveRentalRequestAction,
  cancelRentalRequestAction,
  rejectRentalRequestAction,
} from "@/features/rentals/actions";
import { RentalStatusBadge } from "@/features/rentals/components/rental-status-badge";
import { applyOptimisticRentalStatus } from "@/features/rentals/lib/optimistic-rental-groups";
import {
  formatCreatedAt,
  formatRentalDates,
  formatRentalMoney,
} from "@/features/rentals/services/format";
import type {
  RentalCardView,
  SellerRentalsGrouped,
} from "@/features/rentals/types/rental";
import { trackEvent } from "@/lib/analytics/events";
import { queryKeys } from "@/lib/query-keys";

type SellerRequestCardProps = {
  rental: RentalCardView;
};

export function SellerRequestCard({ rental }: SellerRequestCardProps) {
  const queryClient = useQueryClient();
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [showReject, setShowReject] = React.useState(false);
  const [reason, setReason] = React.useState("");

  function optimisticStatus(nextStatus: RentalStatus) {
    queryClient.setQueryData<SellerRentalsGrouped>(
      queryKeys.rentals.seller(),
      (prev) =>
        prev ? applyOptimisticRentalStatus(prev, rental.id, nextStatus) : prev,
    );
  }

  async function run(
    action: () => Promise<
      { ok: true } | { ok: false; error: { message: string } }
    >,
    nextStatus?: RentalStatus,
  ) {
    setError(null);
    setBusy(true);
    if (nextStatus) optimisticStatus(nextStatus);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.rentals.seller(),
      });
      return;
    }
    setShowReject(false);
    afterLiveMutation(queryClient, [rental.buyer.id], {
      rentalId: rental.id,
    });
  }

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
              <h2 className="line-clamp-2 text-sm font-semibold tracking-tight sm:text-base">
                {rental.listing.title}
              </h2>
              <p className="text-muted-foreground mt-0.5 text-xs">
                Buyer · {rental.buyer.displayName}
              </p>
            </div>
            <RentalStatusBadge status={rental.status} />
          </div>

          <p className="text-sm">{formatRentalDates(rental)}</p>
          <p className="text-sm font-medium">
            {formatRentalMoney(rental.estimatedRent, rental.currency)}
            {rental.estimatedDeposit > 0
              ? ` · ${formatRentalMoney(rental.estimatedDeposit, rental.currency)} deposit`
              : " · No deposit"}
          </p>
          {rental.messageToSeller ? (
            <p className="bg-muted/60 text-foreground/90 rounded-xl px-3 py-2 text-xs">
              “{rental.messageToSeller}”
            </p>
          ) : null}
          <p className="text-muted-foreground text-xs">
            Received {formatCreatedAt(rental.createdAt)}
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

        {rental.status === "REQUESTED" ? (
          <>
            <Button
              type="button"
              size="sm"
              className="h-9"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await approveRentalRequestAction(rental.id);
                  if (result.ok) {
                    trackEvent("rental_approve", { rental_id: rental.id });
                  }
                  return result.ok
                    ? { ok: true as const }
                    : { ok: false as const, error: result.error };
                }, "HANDOVER_PENDING")
              }
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={busy}
              onClick={() => setShowReject((value) => !value)}
            >
              Reject
            </Button>
          </>
        ) : null}

        {rental.status === "APPROVED" ||
        rental.status === "HANDOVER_PENDING" ? (
          <>
            <Link
              href={`/rentals/${rental.id}/handover`}
              className="bg-brand-gradient inline-flex h-9 items-center rounded-lg px-3 text-[0.8rem] font-medium text-white shadow-[var(--rp-shadow-xs)]"
            >
              Handover verify
            </Link>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-9"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  const result = await cancelRentalRequestAction({
                    rentalId: rental.id,
                    reason: "Cancelled by seller",
                  });
                  return result.ok
                    ? { ok: true as const }
                    : { ok: false as const, error: result.error };
                }, "CANCELLED")
              }
            >
              Cancel approval
            </Button>
          </>
        ) : null}

        {rental.status === "ACTIVE" || rental.status === "RETURN_PENDING" ? (
          <Link
            href={`/rentals/${rental.id}/return`}
            className="bg-brand-gradient inline-flex h-9 items-center rounded-lg px-3 text-[0.8rem] font-medium text-white shadow-[var(--rp-shadow-xs)]"
          >
            {rental.status === "RETURN_PENDING"
              ? "Review Return"
              : "Open return"}
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
      </div>

      {showReject ? (
        <form
          className="border-border/70 space-y-3 border-t px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(async () => {
              const result = await rejectRentalRequestAction({
                rentalId: rental.id,
                reason,
              });
              return result.ok
                ? { ok: true as const }
                : { ok: false as const, error: result.error };
            }, "REJECTED");
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor={`reject-${rental.id}`}>Rejection reason</Label>
            <Textarea
              id={`reject-${rental.id}`}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              required
              minLength={3}
              maxLength={500}
              placeholder="Let the buyer know why"
              className="min-h-20"
            />
          </div>
          <Button type="submit" variant="destructive" size="sm" disabled={busy}>
            Confirm reject
          </Button>
        </form>
      ) : null}

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
