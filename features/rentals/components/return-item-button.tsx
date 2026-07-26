"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { afterLiveMutation } from "@/features/realtime/live-sync";
import { applyOptimisticRentalStatus } from "@/features/rentals/lib/optimistic-rental-groups";
import type { BuyerRentalsGrouped } from "@/features/rentals/types/rental";
import { requestReturnAction } from "@/features/verification/actions";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type ReturnItemButtonProps = {
  rentalId: string;
  peerUserId: string;
  className?: string;
};

/**
 * Buyer-only entry: confirm dialog → requestReturnAction → return page.
 */
export function ReturnItemButton({
  rentalId,
  peerUserId,
  className,
}: ReturnItemButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function confirmReturn() {
    setError(null);
    setBusy(true);
    queryClient.setQueryData<BuyerRentalsGrouped>(
      queryKeys.rentals.buyer(),
      (prev) =>
        prev
          ? applyOptimisticRentalStatus(prev, rentalId, "RETURN_PENDING")
          : prev,
    );
    const result = await requestReturnAction({ rentalId });
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      void queryClient.invalidateQueries({
        queryKey: queryKeys.rentals.buyer(),
      });
      return;
    }
    setOpen(false);
    afterLiveMutation(queryClient, [result.data.peerUserId || peerUserId], {
      rentalId,
    });
    router.push(`/rentals/${rentalId}/return`);
  }

  return (
    <>
      <Button
        type="button"
        size="sm"
        className={cn("h-9", className)}
        onClick={() => {
          setError(null);
          setOpen(true);
        }}
      >
        Return Item
      </Button>

      {open ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy) {
              setOpen(false);
            }
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="return-item-title"
            className="border-border bg-card w-full max-w-md rounded-2xl border p-5 shadow-[var(--rp-shadow-md)]"
          >
            <h2
              id="return-item-title"
              className="text-lg font-semibold tracking-tight"
            >
              Return this item?
            </h2>
            <p className="text-muted-foreground mt-2 text-sm">
              You are confirming that you are ready to return the rented item to
              the owner. You will complete QR/PIN at the meetup, then both of
              you must confirm.
            </p>
            {error ? (
              <p className="text-destructive mt-3 text-sm" role="alert">
                {error}
              </p>
            ) : null}
            <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => void confirmReturn()}
              >
                {busy ? "Starting…" : "Yes, Return Item"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
