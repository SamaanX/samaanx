"use client";

import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, X } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  type AvailabilityHints,
  estimateRentalCost,
  isRangeSelectable,
  todayDateOnlyUtc,
} from "@/domain/rental";
import { afterLiveMutation } from "@/features/realtime/live-sync";
import { createRentalRequestAction } from "@/features/rentals/actions";
import { RentalSummaryCard } from "@/features/rentals/components/rental-summary-card";
import { formatDeposit } from "@/features/search/services/format";
import type { PublicListingDetailView } from "@/features/search/types/marketplace";
import { trackEvent } from "@/lib/analytics/events";

type DateHints = AvailabilityHints;

type RentalRequestDialogProps = {
  open: boolean;
  onClose: () => void;
  listing: Pick<
    PublicListingDetailView,
    | "id"
    | "title"
    | "slug"
    | "rentPriceAmount"
    | "rentPriceUnit"
    | "currency"
    | "depositType"
    | "depositAmount"
    | "depositPercent"
  >;
  hints: DateHints;
};

export function RentalRequestDialog({
  open,
  onClose,
  listing,
  hints,
}: RentalRequestDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const today = todayDateOnlyUtc();
  const [mounted, setMounted] = React.useState(false);
  const [startDate, setStartDate] = React.useState("");
  const [endDate, setEndDate] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [showMessage, setShowMessage] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  React.useEffect(() => {
    if (!open) return;
    setStartDate("");
    setEndDate("");
    setMessage("");
    setShowMessage(false);
    setError(null);
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const estimate =
    startDate && endDate && endDate >= startDate
      ? estimateRentalCost({
          startDate,
          endDate,
          rentPriceAmount: listing.rentPriceAmount,
          rentPriceUnit: listing.rentPriceUnit,
          depositType: listing.depositType,
          depositAmount: listing.depositAmount,
          depositPercent: listing.depositPercent,
        })
      : null;

  const rangeOk =
    Boolean(startDate && endDate) &&
    isRangeSelectable(startDate, endDate, hints);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);

    if (!startDate || !endDate) {
      setError("Choose start and end dates.");
      return;
    }
    if (!isRangeSelectable(startDate, endDate, hints)) {
      setError("Selected dates are unavailable. Pick another range.");
      return;
    }

    setPending(true);
    const result = await createRentalRequestAction({
      listingId: listing.id,
      startDate,
      endDate,
      messageToSeller: message,
    });
    setPending(false);

    if (!result.ok) {
      if (result.error.code === "UNAUTHORIZED") {
        router.push(
          `/login?next=${encodeURIComponent(`/listings/${listing.slug}`)}`,
        );
        return;
      }
      setError(result.error.message);
      return;
    }

    onClose();
    trackEvent("rental_request", { listing_id: listing.id });
    afterLiveMutation(queryClient, [result.data.sellerId], {
      rentalId: result.data.rentalId,
    });
    router.push("/rentals");
  }

  const unitLabel =
    listing.rentPriceUnit === "DAY"
      ? "/day"
      : listing.rentPriceUnit === "WEEK"
        ? "/week"
        : "/month";

  const availabilityHint =
    hints.available[0] != null
      ? `${hints.available[0].startDate} → ${hints.available[0].endDate}`
      : null;

  if (!mounted) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
          <motion.button
            type="button"
            aria-label="Close dialog backdrop"
            className="absolute inset-0 bg-black/55"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="rental-request-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 24 }}
            transition={{ duration: 0.2, ease: [0.2, 0.8, 0.2, 1] }}
            className="border-border bg-card relative z-10 flex w-full max-w-[420px] flex-col overflow-hidden rounded-t-2xl border shadow-[var(--rp-shadow-lg)] sm:rounded-2xl"
            style={{ maxHeight: "min(72dvh, 520px)" }}
          >
            <div className="bg-muted mx-auto mt-2 h-1 w-10 shrink-0 rounded-full sm:hidden" />

            <div className="flex shrink-0 items-center justify-between gap-2 px-4 pt-2 pb-2 sm:px-5 sm:pt-4">
              <div className="min-w-0">
                <h2
                  id="rental-request-title"
                  className="truncate text-base font-semibold tracking-tight"
                >
                  Request to rent
                </h2>
                <p className="text-muted-foreground truncate text-xs">
                  {listing.title}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="hover:bg-muted focus-visible:ring-ring inline-flex size-9 shrink-0 items-center justify-center rounded-lg focus-visible:ring-2 focus-visible:outline-none"
                aria-label="Close"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>

            <form
              onSubmit={(e) => void onSubmit(e)}
              className="flex min-h-0 flex-1 flex-col"
            >
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 pb-2 sm:px-5">
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label htmlFor="rental-start" className="text-xs">
                      Start date
                    </Label>
                    <Input
                      id="rental-start"
                      type="date"
                      min={today}
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                      className="h-10 w-full min-w-0 text-sm"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="rental-end" className="text-xs">
                      End date
                    </Label>
                    <Input
                      id="rental-end"
                      type="date"
                      min={startDate || today}
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      required
                      className="h-10 w-full min-w-0 text-sm"
                    />
                  </div>
                </div>

                {startDate && endDate && !rangeOk ? (
                  <p className="text-destructive text-xs" role="alert">
                    These dates aren’t available. Try another range.
                  </p>
                ) : null}

                {availabilityHint ? (
                  <p className="text-muted-foreground text-[0.7rem] leading-snug">
                    Available: {availabilityHint}
                  </p>
                ) : null}

                {!showMessage ? (
                  <button
                    type="button"
                    onClick={() => setShowMessage(true)}
                    className="text-brand-blue inline-flex items-center gap-1 text-xs font-medium hover:underline"
                  >
                    Add a message
                    <ChevronDown className="size-3.5" aria-hidden />
                  </button>
                ) : (
                  <div className="space-y-1">
                    <Label htmlFor="rental-message" className="text-xs">
                      Message (optional)
                    </Label>
                    <Textarea
                      id="rental-message"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      maxLength={500}
                      placeholder="Say hello or ask a question"
                      rows={2}
                      className="min-h-[3.25rem] resize-none text-sm"
                      autoFocus
                    />
                  </div>
                )}

                {estimate ? (
                  <RentalSummaryCard
                    currency={listing.currency}
                    estimate={estimate}
                    rentPriceAmount={listing.rentPriceAmount}
                    rentUnitLabel={unitLabel}
                    depositLabel={formatDeposit({
                      depositType: listing.depositType,
                      depositAmount: listing.depositAmount,
                      depositPercent: listing.depositPercent,
                      currency: listing.currency,
                    })}
                  />
                ) : (
                  <p className="text-muted-foreground text-[0.7rem]">
                    Pick dates for an estimate. No payment on SamaanX yet.
                  </p>
                )}

                {error ? (
                  <p className="text-destructive text-xs" role="alert">
                    {error}
                  </p>
                ) : null}
              </div>

              <div className="border-border/60 bg-card shrink-0 border-t px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:pb-4">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 flex-1"
                    onClick={onClose}
                    disabled={pending}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-10 flex-[1.5]"
                    disabled={pending || !rangeOk}
                  >
                    {pending ? "Submitting…" : "Submit request"}
                  </Button>
                </div>
              </div>
            </form>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
