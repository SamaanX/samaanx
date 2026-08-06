"use client";

import { Search } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import type { ChatConversationListItem } from "@/features/chat/types/chat";
import { RentalStatusBadge } from "@/features/rentals/components/rental-status-badge";
import { cn } from "@/lib/utils";

type ConversationListProps = {
  items: ChatConversationListItem[];
  activeId: string | null;
  onlineIds: ReadonlySet<string>;
  className?: string;
};

export function ConversationList({
  items,
  activeId,
  onlineIds,
  className,
}: ConversationListProps) {
  const [q, setQ] = React.useState("");
  const filtered = React.useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return items;
    return items.filter(
      (item) =>
        item.peer.displayName.toLowerCase().includes(needle) ||
        item.listing.title.toLowerCase().includes(needle) ||
        (item.lastMessagePreview ?? "").toLowerCase().includes(needle),
    );
  }, [items, q]);

  return (
    <div
      className={cn("bg-background flex h-full min-h-0 flex-col", className)}
    >
      <div className="border-border/60 border-b px-3 py-3 sm:px-4">
        <h1 className="text-lg font-semibold tracking-tight">Messages</h1>
        <div className="relative mt-2.5">
          <Search
            className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
            aria-hidden
          />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search conversations"
            className="h-10 pl-9"
            aria-label="Search conversations"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-muted-foreground px-4 py-12 text-center text-sm">
            {items.length === 0
              ? "No conversations yet. Open Chat from a rental request."
              : "No matches."}
          </div>
        ) : (
          <ul className="divide-border/50 divide-y">
            {filtered.map((item) => {
              const online = onlineIds.has(item.peer.id);
              const active = item.id === activeId;
              const initials = item.peer.displayName
                .split(/\s+/)
                .map((p) => p[0])
                .join("")
                .slice(0, 2)
                .toUpperCase();
              return (
                <li key={item.id}>
                  <Link
                    href={`/chat/${item.id}`}
                    className={cn(
                      "hover:bg-muted/50 flex gap-3 px-3 py-3 transition-colors sm:px-4",
                      active && "bg-brand-blue-soft/40",
                    )}
                  >
                    <div className="relative shrink-0">
                      <Avatar size="lg">
                        {item.peer.avatarUrl ? (
                          <AvatarImage src={item.peer.avatarUrl} alt="" />
                        ) : null}
                        <AvatarFallback>{initials}</AvatarFallback>
                      </Avatar>
                      <span
                        className={cn(
                          "ring-background absolute right-0 bottom-0 size-2.5 rounded-full ring-2",
                          online ? "bg-brand-green" : "bg-muted-foreground/40",
                        )}
                        aria-hidden
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p className="truncate text-sm font-semibold">
                          {item.peer.displayName}
                        </p>
                        {item.unreadCount > 0 ? (
                          <span className="bg-brand-green inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[0.65rem] font-bold text-white">
                            {item.unreadCount > 99 ? "99+" : item.unreadCount}
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-0.5 flex items-center gap-2">
                        <div className="bg-muted relative size-7 shrink-0 overflow-hidden rounded-md">
                          {item.listing.coverImageUrl ? (
                            <Image
                              src={item.listing.coverImageUrl}
                              alt=""
                              fill
                              className="object-cover"
                              sizes="28px"
                            />
                          ) : null}
                        </div>
                        <p className="text-muted-foreground truncate text-xs">
                          {item.listing.title}
                        </p>
                      </div>
                      <div className="mt-1 flex items-center justify-between gap-2">
                        <p className="text-muted-foreground truncate text-xs">
                          {item.lastMessagePreview ?? "No messages yet"}
                        </p>
                        <RentalStatusBadge status={item.rentalStatus} />
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
