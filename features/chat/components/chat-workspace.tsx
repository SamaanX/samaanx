"use client";

import { ChatThread } from "@/features/chat/components/chat-thread";
import { ConversationList } from "@/features/chat/components/conversation-list";
import {
  useChatInbox,
  usePresenceOnlineIds,
} from "@/features/chat/hooks/use-chat";
import type {
  ChatConversationListItem,
  ChatMessagesPage,
  ChatThreadHeader,
} from "@/features/chat/types/chat";
import { cn } from "@/lib/utils";

type ChatWorkspaceProps = {
  userId: string;
  myName: string;
  viewerRole: "buyer" | "seller";
  initialInbox: ChatConversationListItem[];
  activeId?: string | null;
  initialHeader?: ChatThreadHeader | null;
  initialPage?: ChatMessagesPage | null;
};

export function ChatWorkspace({
  userId,
  myName,
  viewerRole,
  initialInbox,
  activeId = null,
  initialHeader = null,
  initialPage = null,
}: ChatWorkspaceProps) {
  const inbox = useChatInbox(initialInbox);
  const items = inbox.data ?? initialInbox;
  const onlineIds = usePresenceOnlineIds();

  const hasThread = Boolean(activeId && initialHeader && initialPage);

  return (
    <div className="border-border/60 bg-background mx-auto flex h-[calc(100dvh-4rem)] w-full max-w-6xl overflow-hidden md:h-[calc(100dvh-4.5rem)] md:rounded-2xl md:border md:shadow-[var(--rp-shadow-sm)]">
      <aside
        className={cn(
          "border-border/60 w-full min-w-0 border-r md:w-[22rem] lg:w-[26rem]",
          hasThread ? "hidden md:flex md:flex-col" : "flex flex-col",
        )}
      >
        <ConversationList
          items={items}
          activeId={activeId}
          onlineIds={onlineIds}
          className="h-full"
        />
      </aside>

      <section
        className={cn(
          "min-w-0 flex-1",
          hasThread ? "flex flex-col" : "hidden md:flex md:flex-col",
        )}
      >
        {hasThread && activeId && initialHeader && initialPage ? (
          <ChatThread
            conversationId={activeId}
            userId={userId}
            myName={myName}
            role={viewerRole}
            initialHeader={initialHeader}
            initialPage={initialPage}
            showBack
          />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
            <p className="text-base font-semibold tracking-tight">
              Select a conversation
            </p>
            <p className="text-muted-foreground max-w-sm text-sm">
              Chat is tied to each rental. Open a thread from your rentals, or
              pick one from the list.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
