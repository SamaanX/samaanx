"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import * as React from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { afterLiveMutation } from "@/features/realtime/live-sync";
import { ReportDialog } from "@/features/reports/components/report-dialog";
import {
  confirmStageAction,
  generateVerificationAction,
  getVerificationStatusAction,
  regenerateVerificationAction,
  verifyPinAction,
  verifyQrAction,
} from "@/features/verification/actions";
import { CountdownTimer } from "@/features/verification/components/countdown-timer";
import { QrDisplay } from "@/features/verification/components/qr-display";
import {
  buildReturnProgressSteps,
  ReturnProgress,
} from "@/features/verification/components/return-progress";
import { VerificationStateScreen } from "@/features/verification/components/verification-state-screen";
import type { VerificationStatusView } from "@/features/verification/types/verification";
import { trackEvent } from "@/lib/analytics/events";
import { queryKeys } from "@/lib/query-keys";
import { useRealtimeRentalSync } from "@/providers/realtime-sync-provider";

type VerificationPanelProps = {
  initial: VerificationStatusView;
  stage: "HANDOVER" | "RETURN";
};

export function VerificationPanel({ initial, stage }: VerificationPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [pinInput, setPinInput] = React.useState("");
  const [qrInput, setQrInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [busy, setBusy] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const initialUpdatedAtRef = React.useRef(Date.now());

  const statusQuery = useQuery({
    queryKey: queryKeys.verification.status(initial.rentalId, stage),
    queryFn: async () => {
      const result = await getVerificationStatusAction({
        rentalId: initial.rentalId,
        stage,
      });
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    initialData: initial,
    initialDataUpdatedAt: initialUpdatedAtRef.current,
    // Live sync invalidates verification keys; avoid mount double-fetch.
    staleTime: 15_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: true,
  });

  const status = statusQuery.data ?? initial;

  const refreshStatus = React.useCallback(async () => {
    await statusQuery.refetch();
  }, [statusQuery]);

  useRealtimeRentalSync(
    React.useCallback(() => {
      void refreshStatus();
    }, [refreshStatus]),
    initial.rentalId,
  );

  async function run<T>(
    action: () => Promise<
      { ok: true; data: T } | { ok: false; error: { message: string } }
    >,
    onOk?: (data: T) => void,
  ) {
    setError(null);
    setMessage(null);
    setBusy(true);
    const result = await action();
    setBusy(false);
    if (!result.ok) {
      setError(result.error.message);
      return;
    }
    onOk?.(result.data);
    await refreshStatus();
    afterLiveMutation(queryClient, [status.peerUserId], {
      rentalId: status.rentalId,
    });
  }

  const stageLabel = stage === "HANDOVER" ? "Handover" : "Return";
  const isReturn = stage === "RETURN";
  const returnSteps = isReturn
    ? buildReturnProgressSteps({
        returnRequested:
          Boolean(status.verificationId) ||
          status.rentalStatus === "RETURN_PENDING" ||
          status.rentalStatus === "COMPLETED",
        isVerified: status.isVerified,
        buyerConfirmed: status.buyerConfirmed,
        sellerConfirmed: status.sellerConfirmed,
        bothConfirmed: status.bothConfirmed,
      })
    : [];

  if (status.bothConfirmed) {
    return (
      <div className="space-y-4">
        {isReturn ? <ReturnProgress steps={returnSteps} /> : null}
        <VerificationStateScreen
          variant="success"
          title={`${stageLabel} complete`}
          description={
            stage === "HANDOVER"
              ? "Both parties confirmed. This rental is now active."
              : "Both parties confirmed return. This rental is completed."
          }
        />
        {isReturn ? (
          <Button
            type="button"
            className="w-full"
            onClick={() => router.push(`/rentals/${status.rentalId}/review`)}
          >
            Leave Review
          </Button>
        ) : null}
      </div>
    );
  }

  if (status.isLocked) {
    return (
      <div className="space-y-4">
        {isReturn ? <ReturnProgress steps={returnSteps} /> : null}
        <VerificationStateScreen
          variant="locked"
          title="Temporarily locked"
          description={
            status.lockedUntil
              ? `Too many failed attempts. Try again after ${new Date(status.lockedUntil).toLocaleTimeString()}. Status updates automatically when the lockout ends.`
              : "Too many failed attempts. Please wait — status will refresh automatically."
          }
        />
      </div>
    );
  }

  if (!status.verificationId) {
    return (
      <div className="space-y-4">
        {isReturn ? <ReturnProgress steps={returnSteps} /> : null}
        <div className="border-border bg-card space-y-4 rounded-2xl border p-5 shadow-[var(--rp-shadow-sm)]">
          <h2 className="text-lg font-semibold">{stageLabel} codes</h2>
          <p className="text-muted-foreground text-sm">
            {isReturn
              ? status.role === "buyer"
                ? "Start return from My Rentals with Return Item, or generate codes here."
                : "Waiting for the renter to request return. Codes appear once return starts."
              : `Generate secure QR and PIN codes for this ${stageLabel.toLowerCase()}.`}
          </p>
          {error ? (
            <p className="text-destructive text-sm" role="alert">
              {error}
            </p>
          ) : null}
          {!(isReturn && status.role === "seller") ? (
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={busy}
              onClick={() =>
                void run(() =>
                  generateVerificationAction({
                    rentalId: status.rentalId,
                    stage,
                  }),
                )
              }
            >
              Generate {stageLabel} codes
            </Button>
          ) : null}
        </div>
      </div>
    );
  }

  if (status.isExpired && !status.isVerified) {
    return (
      <div className="space-y-4">
        {isReturn ? <ReturnProgress steps={returnSteps} /> : null}
        <VerificationStateScreen
          variant="expired"
          title="Codes expired"
          description="Generate a new QR and PIN. Previous codes are invalidated."
        />
        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        <Button
          type="button"
          size="lg"
          className="w-full"
          disabled={busy}
          onClick={() =>
            void run(() =>
              regenerateVerificationAction({
                rentalId: status.rentalId,
                stage,
              }),
            )
          }
        >
          Regenerate codes
        </Button>
      </div>
    );
  }

  if (status.isVerified) {
    const confirmLabel = isReturn
      ? status.role === "seller"
        ? "Yes, I Received It"
        : "Confirm I Returned It"
      : `Confirm ${stageLabel.toLowerCase()}`;

    return (
      <div className="space-y-4">
        {isReturn ? <ReturnProgress steps={returnSteps} /> : null}

        <VerificationStateScreen
          variant="success"
          title={`${stageLabel} verified`}
          description={
            status.verifiedMethod
              ? `Verified via ${status.verifiedMethod}. Both parties must confirm to finish.`
              : "Verified. Both parties must confirm to finish."
          }
        />

        {isReturn && status.role === "seller" ? (
          <div className="border-brand-green/30 bg-brand-green-soft/50 rounded-2xl border p-4">
            <p className="text-brand-green text-sm font-semibold">
              {status.buyerConfirmed
                ? "Buyer has confirmed the return."
                : "QR/PIN verified — confirm when you have the item."}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">
              Did you receive your item in acceptable condition?
            </p>
          </div>
        ) : null}

        <div className="border-border bg-card rounded-2xl border p-4 text-sm shadow-[var(--rp-shadow-xs)]">
          <p>
            Buyer:{" "}
            <strong>{status.buyerConfirmed ? "Confirmed" : "Pending"}</strong>
          </p>
          <p className="mt-1">
            Seller:{" "}
            <strong>{status.sellerConfirmed ? "Confirmed" : "Pending"}</strong>
          </p>
        </div>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
        {message ? (
          <p className="text-brand-green text-sm" role="status">
            {message}
          </p>
        ) : null}

        {status.canConfirm ? (
          <div className="space-y-2">
            {isReturn && status.role === "seller" ? (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={busy}
                onClick={() =>
                  toast.message("Not yet", {
                    description:
                      "Take your time to inspect the item. Confirm when ready.",
                  })
                }
              >
                Not Yet
              </Button>
            ) : null}
            <Button
              type="button"
              size="lg"
              className="w-full"
              disabled={busy}
              onClick={() =>
                void run(
                  () =>
                    confirmStageAction({
                      rentalId: status.rentalId,
                      stage,
                    }),
                  (data) => {
                    if (data.bothConfirmed) {
                      setMessage(`${stageLabel} fully completed.`);
                      if (stage === "RETURN") {
                        trackEvent("rental_completed", {
                          rental_id: status.rentalId,
                        });
                      }
                    } else {
                      setMessage(
                        isReturn && status.role === "buyer"
                          ? "Waiting for seller confirmation…"
                          : "Your confirmation was saved.",
                      );
                    }
                  },
                )
              }
            >
              {confirmLabel}
            </Button>
            {isReturn && status.role === "seller" ? (
              <ReportDialog
                target={{
                  targetType: "RENTAL",
                  targetId: status.rentalId,
                  rentalId: status.rentalId,
                  label: "rental",
                }}
                variant="ghost"
                triggerLabel="Report an Issue"
                triggerClassName="w-full text-muted-foreground"
              />
            ) : null}
          </div>
        ) : status.youConfirmed ? (
          <p className="bg-muted/60 text-muted-foreground rounded-xl px-4 py-3 text-center text-sm">
            {isReturn && status.role === "buyer"
              ? "Waiting for seller confirmation…"
              : "Waiting for the other party to confirm…"}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isReturn ? <ReturnProgress steps={returnSteps} /> : null}

      {isReturn && status.role === "buyer" ? (
        <p className="border-brand-blue/20 bg-brand-blue-soft/50 text-brand-blue rounded-xl border px-4 py-3 text-sm">
          Return started. Complete QR/PIN with the owner, then confirm. You will
          wait for seller confirmation before the rental completes.
        </p>
      ) : null}

      <div className="border-border bg-card rounded-2xl border p-5 shadow-[var(--rp-shadow-sm)]">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">{stageLabel} codes</h2>
            <p className="text-muted-foreground text-sm">
              Show QR or share PIN at the meeting. Either works.
            </p>
          </div>
          {status.expiresAt ? (
            <CountdownTimer
              expiresAt={status.expiresAt}
              onExpire={() => void refreshStatus()}
            />
          ) : null}
        </div>

        {status.qrPayload ? <QrDisplay payload={status.qrPayload} /> : null}

        {status.pin ? (
          <div className="bg-brand-blue-soft mt-4 rounded-xl px-4 py-3 text-center">
            <p className="text-muted-foreground text-xs font-medium">PIN</p>
            <p
              className="text-brand-blue mt-1 font-mono text-3xl font-semibold tracking-[0.35em]"
              aria-label={`PIN ${status.pin.split("").join(" ")}`}
            >
              {status.pin}
            </p>
          </div>
        ) : null}

        <p className="text-muted-foreground mt-3 text-center text-xs">
          Failed attempts: {status.failedAttempts}/{status.maxAttempts}
        </p>

        {status.canRegenerate ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4 w-full"
            disabled={busy}
            onClick={() =>
              void run(() =>
                regenerateVerificationAction({
                  rentalId: status.rentalId,
                  stage,
                }),
              )
            }
          >
            Regenerate codes
          </Button>
        ) : null}
      </div>

      <div className="border-border bg-card space-y-4 rounded-2xl border p-5 shadow-[var(--rp-shadow-sm)]">
        <h3 className="text-base font-semibold">Verify at meeting</h3>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() =>
              verifyPinAction({
                rentalId: status.rentalId,
                stage,
                pin: pinInput,
              }),
            );
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="verify-pin">Enter 6-digit PIN</Label>
            <Input
              id="verify-pin"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              value={pinInput}
              onChange={(e) =>
                setPinInput(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="h-12 text-center font-mono text-lg tracking-[0.3em]"
              aria-describedby="pin-help"
            />
            <p id="pin-help" className="text-muted-foreground text-xs">
              Enter the PIN shown on the other party’s screen.
            </p>
          </div>
          <Button
            type="submit"
            size="lg"
            className="w-full"
            disabled={busy || pinInput.length !== 6 || !status.canVerify}
          >
            Verify PIN
          </Button>
        </form>

        <div className="text-muted-foreground relative py-1 text-center text-xs">
          <span className="bg-card px-2">or</span>
          <div className="bg-border absolute inset-x-0 top-1/2 -z-10 h-px" />
        </div>

        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void run(() =>
              verifyQrAction({
                rentalId: status.rentalId,
                stage,
                qrPayload: qrInput.trim() || status.qrPayload || "",
              }),
            );
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="verify-qr">Paste scanned QR payload</Label>
            <Input
              id="verify-qr"
              value={qrInput}
              onChange={(e) => setQrInput(e.target.value)}
              placeholder="RENTPE|…"
              className="h-11 font-mono text-xs"
            />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={busy || !status.qrPayload || !status.canVerify}
              onClick={() =>
                void run(() =>
                  verifyQrAction({
                    rentalId: status.rentalId,
                    stage,
                    qrPayload: status.qrPayload!,
                  }),
                )
              }
            >
              Verify shown QR
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={
                busy ||
                !status.canVerify ||
                !(qrInput.trim() || status.qrPayload)
              }
            >
              Verify pasted QR
            </Button>
          </div>
        </form>

        {error ? (
          <p className="text-destructive text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
