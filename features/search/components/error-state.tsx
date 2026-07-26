"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";

type MarketplaceErrorStateProps = {
  title?: string;
  description?: string;
};

export function MarketplaceErrorState({
  title = "Something went wrong",
  description = "We couldn’t load this page. Please try again.",
}: MarketplaceErrorStateProps) {
  const router = useRouter();

  return (
    <div className="border-border bg-card flex flex-col items-center justify-center rounded-2xl border px-6 py-16 text-center shadow-[var(--rp-shadow-sm)]">
      <div className="bg-destructive/10 mb-4 flex size-14 items-center justify-center rounded-2xl">
        <AlertCircle className="text-destructive size-7" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </p>
      <Button
        type="button"
        className="mt-6"
        size="lg"
        onClick={() => router.refresh()}
      >
        Retry
      </Button>
    </div>
  );
}
