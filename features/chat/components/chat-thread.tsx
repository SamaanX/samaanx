"use client";

import { useVirtualizer } from "@tanstack/react-virtual";
import { ArrowLeft, ExternalLink, Home, UserRound } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ChatComposer } from "@/features/chat/components/chat-composer";
import { ChatRentalBannerCard } from "@/features/chat/components/chat-rental-banner";
import { MessageBubble } from "@/features/chat/components/message-bubble";
import { useChatThread, useChatTyping } from "@/features/chat/hooks/use-chat";
import {
  formatLastSeen,
  rentalBannerForChat,
} from "@/features/chat/services/mappers";
import type {
  ChatMessagesPage,
  ChatMessageView,
  ChatThreadHeader,
} from "@/features/chat/types/chat";
import { RentalStatusBadge } from "@/features/rentals/components/rental-status-badge";
import { trackEvent } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

type ChatThreadProps = {
  conversationId: string;
  userId: string;
  myName: string;
  role: "buyer" | "seller";
  initialHeader: ChatThreadHeader;
  initialPage: ChatMessagesPage;
  showBack?: boolean;
};

function dayKey(iso: string): string {
  return iso.slice(0, 10);
}

function formatDayLabel(isoDay: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const y = new Date();
  y.setDate(y.getDate() - 1);
  const yesterday = y.toISOString().slice(0, 10);
  if (isoDay === today) return "Today";
  if (isoDay === yesterday) return "Yesterday";
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  }).format(new Date(`${isoDay}T00:00:00`));
}

export function ChatThread({
  conversationId,
  userId,
  myName,
  role,
  initialHeader,
  initialPage,
  showBack = true,
}: ChatThreadProps) {
  const router = useRouter();
  const [replyTo, setReplyTo] = React.useState<ChatMessageView | null>(null);
  const bottomRef = React.useRef<HTMLDivElement>(null);
  const parentRef = React.useRef<HTMLDivElement>(null);

  const {
    header,
    messages,
    messagesQuery,
    sendText,
    sendAttachment,
    hideMessage,
    deleteForEveryone,
    peerOnline,
  } = useChatThread({
    conversationId,
    userId,
    myName,
    initialHeader,
    initialPage,
  });

  const { peerTypingName, notifyTyping } = useChatTyping({
    conversationId,
    userId,
    displayName: myName,
  });

  const liveHeader = header ?? initialHeader;
  const banner = rentalBannerForChat({
    status: liveHeader.rentalStatus,
    role,
    rentalId: liveHeader.rentalId,
    listingTitle: liveHeader.listing.title,
  });

  const rows = React.useMemo(() => {
    const out: Array<
      | { type: "day"; id: string; label: string }
      | { type: "msg"; id: string; message: ChatMessageView }
    > = [];
    let lastDay = "";
    for (const message of messages) {
      const day = dayKey(message.createdAt);
      if (day !== lastDay) {
        out.push({ type: "day", id: `day-${day}`, label: formatDayLabel(day) });
        lastDay = day;
      }
      out.push({ type: "msg", id: message.id, message });
    }
    return out;
  }, [messages]);

  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 88,
    overscan: 12,
  });

  React.useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, peerTypingName]);

  React.useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    function onScroll() {
      if (!el || el.scrollTop > 80) return;
      if (messagesQuery.hasNextPage && !messagesQuery.isFetchingNextPage) {
        void messagesQuery.fetchNextPage();
      }
    }
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, [messagesQuery]);

  const presenceLabel = peerOnline
    ? "Online"
    : formatLastSeen(liveHeader.peer.lastSeenAt);
  const initials = liveHeader.peer.displayName
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="bg-background flex h-full min-h-0 flex-col">
      <header className="border-border/60 flex items-center gap-2 border-b px-2 py-2 sm:px-3">
        {showBack ? (
          <button
            type="button"
            aria-label="Back"
            onClick={() => router.push("/chat")}
            className="hover:bg-muted inline-flex size-10 items-center justify-center rounded-xl lg:hidden"
          >
            <ArrowLeft className="size-5" />
          </button>
        ) : null}

        <Avatar size="lg">
          {liveHeader.peer.avatarUrl ? (
            <AvatarImage src={liveHeader.peer.avatarUrl} alt="" />
          ) : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {liveHeader.peer.displayName}
          </p>
          <p
            className={cn(
              "truncate text-xs",
              peerOnline ? "text-brand-green" : "text-muted-foreground",
            )}
          >
            {peerTypingName ? `${peerTypingName} is typing...` : presenceLabel}
          </p>
        </div>

        <div className="bg-muted relative hidden size-10 overflow-hidden rounded-lg sm:block">
          {liveHeader.listing.coverImageUrl ? (
            <Image
              src={liveHeader.listing.coverImageUrl}
              alt=""
              fill
              className="object-cover"
              sizes="40px"
            />
          ) : null}
        </div>
        <RentalStatusBadge
          status={liveHeader.rentalStatus}
          className="hidden sm:inline-flex"
        />

        <Link
          href={`/listings/${liveHeader.listing.slug}`}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-10 items-center justify-center rounded-xl"
          aria-label="View listing"
          title="View listing"
        >
          <ExternalLink className="size-4" />
        </Link>
        <Link
          href={role === "buyer" ? "/rentals" : "/seller/rentals"}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-10 items-center justify-center rounded-xl"
          aria-label="Rental details"
          title="Rental details"
        >
          <UserRound className="size-4" />
        </Link>
        <Link
          href="/"
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-10 items-center justify-center rounded-xl"
          aria-label="Home"
        >
          <Home className="size-4" />
        </Link>
      </header>

      {banner ? (
        <div className="py-2">
          <ChatRentalBannerCard banner={banner} />
        </div>
      ) : null}

      <div
        ref={parentRef}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-4"
      >
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: "100%",
            position: "relative",
          }}
        >
          {virtualizer.getVirtualItems().map((item) => {
            const row = rows[item.index]!;
            return (
              <div
                key={row.id}
                data-index={item.index}
                ref={virtualizer.measureElement}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  transform: `translateY(${item.start}px)`,
                }}
                className="pb-2"
              >
                {row.type === "day" ? (
                  <div className="my-2 flex justify-center">
                    <span className="bg-muted text-muted-foreground rounded-full px-3 py-1 text-[0.7rem] font-medium">
                      {row.label}
                    </span>
                  </div>
                ) : (
                  <MessageBubble
                    message={row.message}
                    onReply={setReplyTo}
                    onHide={(id) => void hideMessage(id)}
                    onDeleteForEveryone={(id) => void deleteForEveryone(id)}
                  />
                )}
              </div>
            );
          })}
        </div>
        <div ref={bottomRef} />
      </div>

      <ChatComposer
        disabled={liveHeader.isReadonly}
        readonlyHint={
          liveHeader.isReadonly
            ? "This rental was closed. You can still read past messages."
            : undefined
        }
        replyTo={replyTo}
        onClearReply={() => setReplyTo(null)}
        onTyping={notifyTyping}
        onSendText={(body) => {
          if (messages.length === 0) {
            trackEvent("chat_started", { conversation_id: conversationId });
          }
          const replyPreview = replyTo
            ? {
                id: replyTo.id,
                body: replyTo.body,
                senderName: replyTo.isMine
                  ? myName
                  : liveHeader.peer.displayName,
                hasAttachment: Boolean(replyTo.attachment),
              }
            : null;
          void sendText(body, replyTo?.id, replyPreview);
          setReplyTo(null);
        }}
        onSendFile={async (file, body) => {
          await sendAttachment(file, body, replyTo?.id);
          setReplyTo(null);
        }}
      />
    </div>
  );
}
