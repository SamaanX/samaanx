"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
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

type RentalGroups = BuyerRentalsGrouped | SellerRentalsGrouped;

type SectionDef = {
  id: string;
  title: string;
  description?: string;
  tone?: "urgent" | "default";
  getItems: (groups: RentalGroups) => RentalCardView[];
};

const BUYER_SECTIONS: SectionDef[] = [
  {
    id: "approved",
    title: "Approved — continue rental",
    description: "Complete handover verification to start.",
    tone: "urgent",
    getItems: (g) => g.approved,
  },
  {
    id: "active-returns",
    title: "Return pending",
    description: "Finish return verification with the owner.",
    tone: "urgent",
    getItems: (g) => g.active.filter((r) => r.status === "RETURN_PENDING"),
  },
  {
    id: "pending",
    title: "Pending requests",
    description: "Waiting for seller approval.",
    tone: "urgent",
    getItems: (g) => g.pending,
  },
  {
    id: "active",
    title: "Active rentals",
    getItems: (g) => g.active.filter((r) => r.status === "ACTIVE"),
  },
  {
    id: "rejected",
    title: "Rejected",
    getItems: (g) => g.rejected,
  },
  {
    id: "cancelled",
    title: "Cancelled",
    getItems: (g) => g.cancelled,
  },
  {
    id: "completed",
    title: "Completed",
    getItems: (g) => g.completed,
  },
];

const SELLER_SECTIONS: SectionDef[] = [
  {
    id: "pending",
    title: "New rental requests",
    description: "Approve or reject incoming requests.",
    tone: "urgent",
    getItems: (g) => g.pending,
  },
  {
    id: "approved",
    title: "Waiting for handover",
    description: "Buyer is ready to verify pickup.",
    tone: "urgent",
    getItems: (g) => g.approved,
  },
  {
    id: "returns",
    title: "Return requests",
    description: "Buyer is returning your item.",
    tone: "urgent",
    // RETURN_PENDING is grouped under active in groupRentalsByTab
    getItems: (g) => g.active.filter((r) => r.status === "RETURN_PENDING"),
  },
  {
    id: "active",
    title: "Active rentals",
    getItems: (g) => g.active.filter((r) => r.status === "ACTIVE"),
  },
  {
    id: "rejected",
    title: "Rejected",
    getItems: (g) => g.rejected,
  },
  {
    id: "cancelled",
    title: "Cancelled",
    getItems: (g) => g.cancelled,
  },
  {
    id: "completed",
    title: "Completed rentals",
    getItems: (g) => g.completed,
  },
];

type RentalPriorityDashboardProps = {
  mode: "buyer" | "seller";
  userId: string;
  groups: RentalGroups;
};

export function RentalPriorityDashboard({
  mode,
  groups,
}: RentalPriorityDashboardProps) {
  const sections = mode === "seller" ? SELLER_SECTIONS : BUYER_SECTIONS;
  const queryKey =
    mode === "seller" ? queryKeys.rentals.seller() : queryKeys.rentals.buyer();

  const query = useQuery({
    queryKey,
    queryFn: async (): Promise<RentalGroups> => {
      const result =
        mode === "seller"
          ? await getSellerRentalsAction()
          : await getBuyerRentalsAction();
      if (!result.ok) throw new Error(result.error.message);
      return result.data;
    },
    initialData: groups,
    initialDataUpdatedAt: Date.now(),
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const liveGroups = query.data ?? groups;

  const rendered = sections
    .map((section) => ({
      ...section,
      items: section.getItems(liveGroups),
    }))
    .filter((section) => section.items.length > 0);

  // Urgent nonempty first (already ordered), then rest — sections already sorted.
  const urgent = rendered.filter((s) => s.tone === "urgent");
  const rest = rendered.filter((s) => s.tone !== "urgent");
  const ordered = [...urgent, ...rest];

  if (ordered.length === 0) {
    return (
      <RentalEmptyState
        title={mode === "buyer" ? "No rentals yet" : "No rental activity yet"}
        description={
          mode === "buyer"
            ? "Browse the marketplace and request an item to get started."
            : "When buyers request your listings, they will appear here."
        }
        actionHref={mode === "buyer" ? "/search" : "/seller/listings"}
        actionLabel={mode === "buyer" ? "Browse listings" : "My listings"}
      />
    );
  }

  return (
    <div className="space-y-8">
      {ordered.map((section) => (
        <section key={section.id} className="space-y-3">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2
                className={cn(
                  "text-base font-semibold tracking-tight sm:text-lg",
                  section.tone === "urgent" && "text-brand-blue",
                )}
              >
                {section.title}
                <span className="text-muted-foreground ml-2 text-sm font-medium">
                  ({section.items.length})
                </span>
              </h2>
              {section.description ? (
                <p className="text-muted-foreground mt-0.5 text-xs sm:text-sm">
                  {section.description}
                </p>
              ) : null}
            </div>
            {section.id === "pending" && mode === "seller" ? (
              <Link
                href="/seller/rentals"
                className="text-brand-green shrink-0 text-xs font-semibold underline-offset-4 hover:underline"
              >
                Focus inbox
              </Link>
            ) : null}
          </div>
          <div className="space-y-3">
            {section.items.map((rental) =>
              mode === "buyer" ? (
                <BuyerRentalCard key={rental.id} rental={rental} />
              ) : (
                <SellerRequestCard key={rental.id} rental={rental} />
              ),
            )}
          </div>
        </section>
      ))}
    </div>
  );
}
