"use client";

import { Share2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { ReportDialog } from "@/features/reports/components/report-dialog";

type ListingActionsProps = {
  title: string;
  slug: string;
};

export function ListingShareButton({ title, slug }: ListingActionsProps) {
  const [copied, setCopied] = React.useState(false);

  async function onShare() {
    const url =
      typeof window !== "undefined"
        ? `${window.location.origin}/listings/${slug}`
        : `/listings/${slug}`;

    try {
      if (navigator.share) {
        await navigator.share({ title, url });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // User cancelled share — ignore.
    }
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => void onShare()}
      aria-label="Share listing"
    >
      <Share2 className="size-4" aria-hidden />
      {copied ? "Copied" : "Share"}
    </Button>
  );
}

type ListingReportButtonProps = {
  listingId: string;
  listingTitle?: string;
};

export function ListingReportButton({
  listingId,
  listingTitle = "listing",
}: ListingReportButtonProps) {
  return (
    <ReportDialog
      target={{
        targetType: "LISTING",
        targetId: listingId,
        label: listingTitle,
      }}
      triggerLabel="Report"
    />
  );
}
