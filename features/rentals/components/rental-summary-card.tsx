import { DEFAULT_LOCALE } from "@/config/constants";
import type { CostEstimate } from "@/domain/rental";

type RentalSummaryCardProps = {
  currency: string;
  estimate: CostEstimate;
  rentPriceAmount: number;
  rentUnitLabel: string;
  depositLabel: string;
};

function money(amount: number, currency: string): string {
  return new Intl.NumberFormat(DEFAULT_LOCALE, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function RentalSummaryCard({
  currency,
  estimate,
  rentPriceAmount,
  rentUnitLabel,
  depositLabel,
}: RentalSummaryCardProps) {
  return (
    <div className="border-border/80 bg-muted/30 space-y-1.5 rounded-2xl border p-3 text-sm">
      <h3 className="text-sm font-semibold">Price summary</h3>
      <dl className="space-y-1 text-sm">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Duration</dt>
          <dd className="font-medium">
            {estimate.durationDays} day{estimate.durationDays === 1 ? "" : "s"}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground min-w-0 truncate">
            {money(rentPriceAmount, currency)} {rentUnitLabel}
          </dt>
          <dd className="shrink-0 font-medium">
            {money(estimate.rentSubtotal, currency)}
          </dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">Deposit</dt>
          <dd className="font-medium">
            {estimate.depositAmount > 0
              ? money(estimate.depositAmount, currency)
              : depositLabel}
          </dd>
        </div>
        <div className="border-border/70 flex justify-between gap-3 border-t pt-1.5">
          <dt className="font-semibold">Estimated total</dt>
          <dd className="font-semibold">
            {money(estimate.estimatedTotal, currency)}
          </dd>
        </div>
      </dl>
      <p className="text-muted-foreground text-[0.7rem] leading-snug">
        No payment on SamaanX yet — estimate only.
      </p>
    </div>
  );
}
