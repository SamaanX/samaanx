"use client";

import { useQueryClient } from "@tanstack/react-query";
import { Heart } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { toggleWishlistAction } from "@/features/wishlist/actions/toggle-wishlist";
import { trackEvent } from "@/lib/analytics/events";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

type WishlistButtonProps = {
  listingId: string;
  initialWishlisted: boolean;
  isAuthenticated: boolean;
  className?: string;
  size?: "sm" | "md";
};

export function WishlistButton({
  listingId,
  initialWishlisted,
  isAuthenticated,
  className,
  size = "md",
}: WishlistButtonProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [wishlisted, setWishlisted] = React.useState(initialWishlisted);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    setWishlisted(initialWishlisted);
  }, [initialWishlisted]);

  async function onToggle(event: React.MouseEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (!isAuthenticated) {
      router.push(
        `/login?next=${encodeURIComponent(window.location.pathname)}`,
      );
      return;
    }

    setPending(true);
    const previous = wishlisted;
    setWishlisted(!previous);
    const result = await toggleWishlistAction(listingId);
    setPending(false);

    if (!result.ok) {
      setWishlisted(previous);
      if (result.code === "UNAUTHORIZED") {
        router.push(
          `/login?next=${encodeURIComponent(window.location.pathname)}`,
        );
      }
      return;
    }

    setWishlisted(result.wishlisted);
    trackEvent(result.wishlisted ? "wishlist_add" : "wishlist_remove", {
      listing_id: listingId,
    });
    void queryClient.invalidateQueries({ queryKey: queryKeys.wishlist.all });
  }

  return (
    <button
      type="button"
      onClick={(e) => void onToggle(e)}
      disabled={pending}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? "Remove from wishlist" : "Add to wishlist"}
      className={cn(
        "border-border/80 bg-card/95 text-muted-foreground hover:border-brand-blue/40 hover:text-brand-blue focus-visible:ring-ring inline-flex items-center justify-center rounded-full border shadow-[var(--rp-shadow-xs)] transition-colors focus-visible:ring-2 focus-visible:outline-none disabled:opacity-60",
        size === "sm" ? "size-8" : "size-10",
        wishlisted && "border-brand-green/40 text-brand-green",
        className,
      )}
    >
      <Heart
        className={cn(
          size === "sm" ? "size-3.5" : "size-4",
          wishlisted && "fill-current",
        )}
        aria-hidden
      />
    </button>
  );
}
