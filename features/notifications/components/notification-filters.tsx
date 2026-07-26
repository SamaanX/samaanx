"use client";

import * as React from "react";

import { NOTIFICATION_FILTER_OPTIONS } from "@/features/notifications/lib/inbox-utils";
import type { NotificationFilter } from "@/features/notifications/services/preferences";
import { cn } from "@/lib/utils";

type NotificationFiltersProps = {
  value: NotificationFilter;
  onChange: (filter: NotificationFilter) => void;
  counts?: Partial<Record<NotificationFilter, number>>;
};

export function NotificationFilters({
  value,
  onChange,
  counts,
}: NotificationFiltersProps) {
  return (
    <div
      className="flex [scrollbar-width:none] gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
      role="tablist"
      aria-label="Filter notifications"
    >
      {NOTIFICATION_FILTER_OPTIONS.map((option) => {
        const selected = value === option.id;
        const count = counts?.[option.id];
        return (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={selected}
            onClick={() => onChange(option.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-xs font-semibold transition-colors",
              selected
                ? "border-brand-blue/30 bg-brand-blue-soft text-brand-blue"
                : "border-border/80 bg-card text-muted-foreground hover:border-brand-blue/20 hover:text-foreground",
            )}
          >
            {option.label}
            {typeof count === "number" && count > 0 ? (
              <span className="bg-brand-green inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.65rem] font-bold text-white">
                {count > 99 ? "99+" : count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
