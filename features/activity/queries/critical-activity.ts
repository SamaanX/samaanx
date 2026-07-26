import { cache } from "react";

import type {
  ActivityAlert,
  ActivitySnapshot,
} from "@/features/activity/types/activity";
import { prisma } from "@/lib/db/prisma";
import type { AppUiMode } from "@/lib/ui/app-mode";

const ACTIVE_STATUSES = [
  "REQUESTED",
  "APPROVED",
  "HANDOVER_PENDING",
  "ACTIVE",
  "RETURN_PENDING",
  "REJECTED",
] as const;

/**
 * Lean critical-action snapshot for banners / home guidance.
 * Mode-scoped party filter (buyer OR seller — not both) + React cache().
 */
export const getCriticalActivitySnapshot = cache(
  async (userId: string, mode: AppUiMode): Promise<ActivitySnapshot> => {
    const partyWhere =
      mode === "SELLER" ? { sellerId: userId } : { buyerId: userId };

    const rentals = await prisma.rental.findMany({
      where: {
        ...partyWhere,
        status: { in: [...ACTIVE_STATUSES] },
      },
      select: {
        id: true,
        status: true,
        buyerId: true,
        sellerId: true,
        rejectionReason: true,
        updatedAt: true,
        listing: { select: { title: true, slug: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 24,
    });

    const alerts: ActivityAlert[] = [];
    let sellerPendingCount = 0;
    let buyerPendingCount = 0;
    let buyerApprovedCount = 0;
    let returnPendingCount = 0;

    const sellerPending = rentals.filter(
      (r) => r.sellerId === userId && r.status === "REQUESTED",
    );
    sellerPendingCount = sellerPending.length;

    const buyerPending = rentals.filter(
      (r) => r.buyerId === userId && r.status === "REQUESTED",
    );
    buyerPendingCount = buyerPending.length;

    const buyerApproved = rentals.filter(
      (r) =>
        r.buyerId === userId &&
        (r.status === "APPROVED" || r.status === "HANDOVER_PENDING"),
    );
    buyerApprovedCount = buyerApproved.length;

    const sellerHandover = rentals.filter(
      (r) =>
        r.sellerId === userId &&
        (r.status === "APPROVED" || r.status === "HANDOVER_PENDING"),
    );

    const returnAsBuyer = rentals.filter(
      (r) => r.buyerId === userId && r.status === "RETURN_PENDING",
    );
    const returnAsSeller = rentals.filter(
      (r) => r.sellerId === userId && r.status === "RETURN_PENDING",
    );
    returnPendingCount = returnAsBuyer.length + returnAsSeller.length;

    const recentRejected = rentals.filter(
      (r) =>
        r.buyerId === userId &&
        r.status === "REJECTED" &&
        Date.now() - r.updatedAt.getTime() < 7 * 24 * 60 * 60 * 1000,
    );

    if (mode === "SELLER") {
      if (sellerPendingCount > 0) {
        alerts.push({
          id: "seller-pending-requests",
          tone: "green",
          title:
            sellerPendingCount === 1
              ? "You have 1 new rental request waiting for your approval."
              : `You have ${sellerPendingCount} new rental requests waiting for your approval.`,
          description: sellerPending[0]
            ? `Latest: “${sellerPending[0].listing.title}”`
            : undefined,
          ctaLabel: "Review Requests",
          href: "/seller/rentals",
          priority: 10,
        });
      }

      if (returnAsSeller.length > 0) {
        const item = returnAsSeller[0]!;
        alerts.push({
          id: `seller-return-${item.id}`,
          tone: "purple",
          title: "Buyer has requested to return your item.",
          description: `“${item.listing.title}” — confirm when you receive it.`,
          ctaLabel: "Review Return",
          href: `/rentals/${item.id}/return`,
          priority: 20,
        });
      }

      if (sellerHandover.length > 0) {
        const item = sellerHandover[0]!;
        alerts.push({
          id: `seller-handover-${item.id}`,
          tone: "blue",
          title: "Buyer is waiting to hand over the item.",
          description: `“${item.listing.title}” — open handover verification.`,
          ctaLabel: "Continue Verification",
          href: `/rentals/${item.id}/handover`,
          priority: 30,
        });
      }
    } else {
      if (buyerApprovedCount > 0) {
        const item = buyerApproved[0]!;
        alerts.push({
          id: `buyer-approved-${item.id}`,
          tone: "green",
          title: `Your rental request for “${item.listing.title}” has been approved.`,
          description: "Complete handover verification to start the rental.",
          ctaLabel: "Continue Rental",
          href: `/rentals/${item.id}/handover`,
          priority: 10,
        });
      }

      if (returnAsBuyer.length > 0) {
        const item = returnAsBuyer[0]!;
        alerts.push({
          id: `buyer-return-${item.id}`,
          tone: "orange",
          title: "Return verification is ready.",
          description: `Finish return for “${item.listing.title}”.`,
          ctaLabel: "Complete Return",
          href: `/rentals/${item.id}/return`,
          priority: 20,
        });
      }

      if (buyerPendingCount > 0) {
        const item = buyerPending[0]!;
        alerts.push({
          id: `buyer-pending-${item.id}`,
          tone: "yellow",
          title: "Waiting for seller approval.",
          description:
            buyerPendingCount === 1
              ? `“${item.listing.title}” is awaiting a response.`
              : `${buyerPendingCount} requests are awaiting seller response.`,
          ctaLabel: "View Rentals",
          href: "/rentals",
          priority: 40,
        });
      }

      if (recentRejected.length > 0) {
        const item = recentRejected[0]!;
        alerts.push({
          id: `buyer-rejected-${item.id}`,
          tone: "red",
          title: `Rental request for “${item.listing.title}” was rejected.`,
          description: item.rejectionReason
            ? `Reason: ${item.rejectionReason}`
            : undefined,
          ctaLabel: "View Details",
          href: "/rentals",
          priority: 50,
        });
      }
    }

    alerts.sort((a, b) => a.priority - b.priority);

    return {
      alerts: alerts.slice(0, 3),
      sellerPendingCount,
      buyerPendingCount,
      buyerApprovedCount,
      returnPendingCount,
    };
  },
);
