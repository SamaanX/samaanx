import { Check, Circle, LoaderCircle } from "lucide-react";

import { cn } from "@/lib/utils";

export type ReturnProgressStep = {
  id: string;
  label: string;
  state: "done" | "current" | "pending";
};

type ReturnProgressProps = {
  steps: ReturnProgressStep[];
  className?: string;
};

export function ReturnProgress({ steps, className }: ReturnProgressProps) {
  return (
    <ol
      className={cn(
        "border-border/80 bg-card space-y-3 rounded-2xl border p-4 shadow-[var(--rp-shadow-xs)]",
        className,
      )}
    >
      {steps.map((step, index) => {
        const Icon =
          step.state === "done"
            ? Check
            : step.state === "current"
              ? LoaderCircle
              : Circle;
        return (
          <li key={step.id} className="flex items-start gap-3">
            <span
              className={cn(
                "mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full",
                step.state === "done" && "bg-brand-green text-white",
                step.state === "current" &&
                  "bg-brand-blue-soft text-brand-blue",
                step.state === "pending" && "bg-muted text-muted-foreground",
              )}
              aria-hidden
            >
              <Icon
                className={cn(
                  "size-3.5",
                  step.state === "current" && "animate-spin",
                )}
              />
            </span>
            <div className="min-w-0 flex-1">
              <p
                className={cn(
                  "text-sm font-medium",
                  step.state === "pending" && "text-muted-foreground",
                )}
              >
                {step.label}
              </p>
              {index < steps.length - 1 ? (
                <div
                  className="bg-border mt-2 ml-[-1.35rem] h-3 w-px"
                  aria-hidden
                />
              ) : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export function buildReturnProgressSteps(params: {
  returnRequested: boolean;
  isVerified: boolean;
  buyerConfirmed: boolean;
  sellerConfirmed: boolean;
  bothConfirmed: boolean;
}): ReturnProgressStep[] {
  const {
    returnRequested,
    isVerified,
    buyerConfirmed,
    sellerConfirmed,
    bothConfirmed,
  } = params;

  const requestState: ReturnProgressStep["state"] = returnRequested
    ? "done"
    : "current";
  const verifyState: ReturnProgressStep["state"] = !returnRequested
    ? "pending"
    : isVerified
      ? "done"
      : "current";
  const buyerState: ReturnProgressStep["state"] = !isVerified
    ? "pending"
    : buyerConfirmed
      ? "done"
      : "current";
  const sellerState: ReturnProgressStep["state"] = !isVerified
    ? "pending"
    : sellerConfirmed
      ? "done"
      : buyerConfirmed
        ? "current"
        : "pending";
  const completeState: ReturnProgressStep["state"] = bothConfirmed
    ? "done"
    : "pending";

  return [
    {
      id: "requested",
      label: "Buyer requested return",
      state: requestState,
    },
    {
      id: "verified",
      label: "QR / PIN verified at meetup",
      state: verifyState,
    },
    {
      id: "buyer",
      label: buyerConfirmed
        ? "Buyer confirmed return"
        : "Waiting for buyer confirmation",
      state: buyerState,
    },
    {
      id: "seller",
      label: sellerConfirmed
        ? "Seller confirmed item received"
        : "Waiting for seller confirmation",
      state: sellerState,
    },
    {
      id: "complete",
      label: bothConfirmed ? "Rental completed" : "Rental completion",
      state: completeState,
    },
  ];
}
