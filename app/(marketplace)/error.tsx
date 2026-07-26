"use client";

import { MarketplaceErrorState } from "@/features/search/components/error-state";

export default function MarketplaceError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <MarketplaceErrorState />
      <div className="mt-4 flex justify-center">
        <button
          type="button"
          onClick={reset}
          className="text-brand-blue text-sm font-medium underline-offset-4 hover:underline"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
