"use client";

import { MessageSquareHeart } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { buttonVariants } from "@/components/ui/button";
import { getMyFeedbackAction } from "@/features/feedback/actions/feedback-actions";
import { FeedbackDialog } from "@/features/feedback/components/feedback-dialog";
import { FEEDBACK_STATUS_LABELS } from "@/features/feedback/types/feedback";
import { cn } from "@/lib/utils";

type RecentFeedback = {
  id: string;
  category: string;
  subject: string;
  status: string;
  createdAt: string;
};

export function FeedbackCard() {
  const [recent, setRecent] = React.useState<RecentFeedback[]>([]);
  const [loadingRecent, setLoadingRecent] = React.useState(true);

  React.useEffect(() => {
    void getMyFeedbackAction().then((result) => {
      setLoadingRecent(false);
      if (result.ok) setRecent(result.data);
    });
  }, []);

  return (
    <section
      id="feedback"
      aria-labelledby="feedback-heading"
      className="border-border/70 bg-card scroll-mt-28 overflow-hidden rounded-[1.35rem] border shadow-[var(--rp-shadow-xs)] sm:rounded-[1.5rem]"
    >
      <div className="px-4 py-4 sm:px-5 sm:py-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="bg-brand-green/15 text-brand-green mt-0.5 inline-flex size-9 shrink-0 items-center justify-center rounded-xl">
            <MessageSquareHeart className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2
              id="feedback-heading"
              className="text-lg font-semibold tracking-tight"
            >
              Send feedback
            </h2>
            <p className="text-muted-foreground mt-0.5 text-sm">
              Found a bug or have an idea? Tell us — it only takes a minute.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <FeedbackDialog triggerLabel="Send feedback" variant="default" />
              <Link
                href="/feedback"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  "rounded-xl",
                )}
              >
                Open feedback page
              </Link>
            </div>
          </div>
        </div>

        {!loadingRecent && recent.length > 0 ? (
          <div className="border-border/60 mt-5 space-y-2 border-t pt-4">
            <p className="text-sm font-medium">Your recent submissions</p>
            <ul className="space-y-2">
              {recent.map((item) => (
                <li
                  key={item.id}
                  className="border-border/60 bg-muted/30 rounded-xl border px-3 py-2.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-medium">{item.subject}</p>
                    <span className="text-muted-foreground text-xs">
                      {FEEDBACK_STATUS_LABELS[item.status] ?? item.status}
                    </span>
                  </div>
                  <p className="text-muted-foreground mt-0.5 text-xs">
                    {item.category} ·{" "}
                    {new Date(item.createdAt).toLocaleDateString()}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </section>
  );
}
