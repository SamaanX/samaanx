"use client";

import {
  Check,
  CheckCheck,
  Clock,
  FileText,
  MoreHorizontal,
} from "lucide-react";
import Image from "next/image";
import * as React from "react";

import type { ChatMessageView } from "@/features/chat/types/chat";
import { cn } from "@/lib/utils";

type MessageBubbleProps = {
  message: ChatMessageView;
  onReply: (message: ChatMessageView) => void;
  onHide: (messageId: string) => void;
};

function StatusIcon({ status }: { status: ChatMessageView["status"] }) {
  // Own bubbles use bg-brand-blue — keep ticks high-contrast on that surface.
  if (status === "sending") {
    return (
      <Clock className="size-3.5 stroke-[2.5] text-white/50" aria-hidden />
    );
  }
  if (status === "seen") {
    return (
      <CheckCheck
        className="size-3.5 stroke-[2.75] text-[#5CFFC2] drop-shadow-[0_0_1px_rgba(0,0,0,0.35)]"
        aria-hidden
      />
    );
  }
  if (status === "delivered") {
    return (
      <CheckCheck className="size-3.5 stroke-[2.5] text-white" aria-hidden />
    );
  }
  return <Check className="size-3.5 stroke-[2.5] text-white/75" aria-hidden />;
}

export const MessageBubble = React.memo(function MessageBubble({
  message,
  onReply,
  onHide,
}: MessageBubbleProps) {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(message.createdAt));

  async function copyText() {
    if (message.body) {
      await navigator.clipboard.writeText(message.body);
    }
    setMenuOpen(false);
  }

  return (
    <div
      className={cn(
        "group flex w-full",
        message.isMine ? "justify-end" : "justify-start",
      )}
    >
      <div
        className={cn(
          "relative max-w-[min(85%,28rem)] rounded-2xl px-3.5 py-2.5 shadow-[var(--rp-shadow-xs)]",
          message.isMine
            ? "bg-brand-blue rounded-br-md text-white"
            : "border-border/70 bg-card text-foreground rounded-bl-md border",
          message.optimistic && "opacity-80",
        )}
      >
        {message.replyTo ? (
          <div
            className={cn(
              "mb-2 rounded-xl border-l-2 px-2.5 py-1.5 text-xs",
              message.isMine
                ? "border-white/50 bg-white/10 text-white/90"
                : "border-brand-blue/50 bg-muted/60 text-muted-foreground",
            )}
          >
            <p className="font-semibold">{message.replyTo.senderName}</p>
            <p className="line-clamp-2">
              {message.replyTo.body ||
                (message.replyTo.hasAttachment ? "Attachment" : "")}
            </p>
          </div>
        ) : null}

        {message.attachment?.kind === "IMAGE" ? (
          <a
            href={message.attachment.url}
            target="_blank"
            rel="noreferrer"
            className="mb-2 block overflow-hidden rounded-xl"
          >
            <Image
              src={message.attachment.url}
              alt={message.attachment.name}
              width={320}
              height={240}
              unoptimized
              className="max-h-60 w-auto object-cover"
            />
          </a>
        ) : null}

        {message.attachment?.kind === "DOCUMENT" ? (
          <a
            href={message.attachment.url}
            target="_blank"
            rel="noreferrer"
            className={cn(
              "mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium",
              message.isMine ? "bg-white/15" : "bg-muted",
            )}
          >
            <FileText className="size-4 shrink-0" aria-hidden />
            <span className="min-w-0 truncate">{message.attachment.name}</span>
          </a>
        ) : null}

        {message.body ? (
          <p className="text-sm leading-relaxed break-words whitespace-pre-wrap">
            {message.body}
          </p>
        ) : null}

        <div
          className={cn(
            "mt-1 flex items-center justify-end gap-1 text-[0.65rem]",
            message.isMine ? "text-white/80" : "text-muted-foreground",
          )}
        >
          <span>{time}</span>
          {message.isMine ? <StatusIcon status={message.status} /> : null}
        </div>

        <div className="absolute -top-2 right-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <button
            type="button"
            aria-label="Message actions"
            onClick={() => setMenuOpen((v) => !v)}
            className="border-border bg-card text-foreground inline-flex size-7 items-center justify-center rounded-full border shadow-sm"
          >
            <MoreHorizontal className="size-3.5" />
          </button>
          {menuOpen ? (
            <div className="border-border bg-card absolute right-0 z-20 mt-1 min-w-[8.5rem] overflow-hidden rounded-xl border py-1 text-sm shadow-[var(--rp-shadow-md)]">
              <button
                type="button"
                className="hover:bg-muted block w-full px-3 py-1.5 text-left"
                onClick={() => {
                  onReply(message);
                  setMenuOpen(false);
                }}
              >
                Reply
              </button>
              {message.body ? (
                <button
                  type="button"
                  className="hover:bg-muted block w-full px-3 py-1.5 text-left"
                  onClick={() => void copyText()}
                >
                  Copy
                </button>
              ) : null}
              <button
                type="button"
                className="text-destructive hover:bg-muted block w-full px-3 py-1.5 text-left"
                onClick={() => {
                  onHide(message.id);
                  setMenuOpen(false);
                }}
              >
                Delete for me
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
});
