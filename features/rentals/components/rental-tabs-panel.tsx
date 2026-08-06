"use client";

import { useQuery } from "@tanstack/react-query";
import * as React from "react";

import {
  getBuyerRentalsAction,
  getSellerRentalsAction,
} from "@/features/rentals/actions/get-rentals";
import { BuyerRentalCard } from "@/features/rentals/components/buyer-rental-card";
import { RentalEmptyState } from "@/features/rentals/components/rental-empty-state";
import { SellerRequestCard } from "@/features/rentals/components/seller-request-card";
import type {
  BuyerRentalsGrouped,
  RentalCardView,
  SellerRentalsGrouped,
} from "@/features/rentals/types/rental";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "pending", label: "Pending" },
  { id: "approved", label: "Approved" },
  { id: "active", label: "Active" },
  { id: "rejected", label: "Rejected" },
  { id: "cancelled", label: "Cancelled" },
  { id: "completed", label: "Completed" },
] as const;

export type RentalTabId = (typeof TABS)[number]["id"];

type RentalGroups = BuyerRentalsGrouped | SellerRentalsGrouped;

type RentalTabsPanelProps = {
  mode: "buyer" | "seller";
  userId: string;
  groups: RentalGroups;
  defaultTab?: RentalTabId;
};

export function RentalTabsPanel({
  mode,
  groups,
  defaultTab = "pending",
}: RentalTabsPanelProps) {
  const pendingCount = groups.pending.length;
  const [tab, setTab] = React.useState<RentalTabId>(
    pendingCount > 0 ? "pending" : defaultTab,
  );

  const query = useQuery({
    queryKey:
      mode === "seller"
        ? queryKeys.rentals.seller()
        : queryKeys.rentals.buyer(),
    queryFn: async (): Promise<RentalGroups> => {
      const result =
        mode === "seller"
          ? await getSellerRentalsAction()
          : await getBuyerRentalsAction();
      if (!result.ok) {
        throw new Error(result.error.message);
      }
      return result.data;
    },
    initialData: groups,
    initialDataUpdatedAt: Date.now(),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchInterval: false,
  });

  const liveGroups = query.data ?? groups;
  const items = liveGroups[tab];
  const livePending = liveGroups.pending.length;

  const prevPendingRef = React.useRef(livePending);

  React.useEffect(() => {
    if (mode === "seller" && livePending > prevPendingRef.current) {
      setTab("pending");
    }
    prevPendingRef.current = livePending;
  }, [livePending, mode]);

  return (
    <div className="space-y-4">
      {mode === "seller" && livePending > 0 ? (
        <div
          className="border-brand-green/30 bg-brand-green-soft/60 flex items-start justify-between gap-3 rounded-2xl border px-4 py-3"
          role="status"
        >
          <div>
            <p className="text-brand-green text-sm font-semibold">
              New rental request{livePending > 1 ? "s" : ""}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {livePending} pending — review and approve or reject.
            </p>
          </div>
          <span className="bg-brand-green inline-flex min-h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-bold text-white">
            {livePending}
          </span>
        </div>
      ) : null}

      <div
        role="tablist"
        aria-label={
          mode === "buyer" ? "Buyer rental tabs" : "Seller rental tabs"
        }
        className="flex gap-1 overflow-x-auto pb-1"
      >
        {TABS.map((item) => {
          const count = liveGroups[item.id].length;
          const selected = tab === item.id;
          const emphasizePending =
            mode === "seller" && item.id === "pending" && count > 0;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={selected}
              id={`tab-${item.id}`}
              aria-controls={`panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={cn(
                "focus-visible:ring-ring shrink-0 rounded-full px-3.5 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none",
                selected
                  ? "bg-brand-gradient text-white shadow-[var(--rp-shadow-xs)]"
                  : emphasizePending
                    ? "bg-brand-green-soft text-brand-green ring-brand-green/40 ring-1"
                    : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              {item.label}
              {count > 0 ? (
                <span className="ml-1.5 opacity-80">({count})</span>
              ) : null}
            </button>
          );
        })}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="space-y-3"
      >
        {items.length === 0 ? (
          <RentalEmptyState
            title={`No ${tab} rentals`}
            description={
              mode === "buyer"
                ? "Browse the marketplace and request an item to get started."
                : "When buyers request your listings, they will appear here."
            }
            actionHref={mode === "buyer" ? "/search" : "/seller/listings"}
            actionLabel={mode === "buyer" ? "Browse listings" : "My listings"}
          />
        ) : mode === "buyer" ? (
          items.map((rental: RentalCardView) => (
            <BuyerRentalCard key={rental.id} rental={rental} />
          ))
        ) : (
          items.map((rental: RentalCardView) => (
            <SellerRequestCard key={rental.id} rental={rental} />
          ))
        )}
      </div>
    </div>
  );
}
