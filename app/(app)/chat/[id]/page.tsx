import { notFound, redirect } from "next/navigation";

import { ChatWorkspace } from "@/features/chat/components/chat-workspace";
import {
  getConversationThreadHeader,
  listConversationsForUser,
  listMessagesPage,
} from "@/features/chat/queries/conversations";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";
import { withPerf } from "@/lib/perf";

type ChatThreadPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Chat",
  description: "Rental conversation",
};

export default async function ChatThreadPage({ params }: ChatThreadPageProps) {
  const { id } = await params;

  try {
    const { profile } = await requireUser();

    // Header + messages each enforce membership; no third membership query.
    const { inbox, header, page } = await withPerf("route.chat.thread", () =>
      Promise.all([
        listConversationsForUser(profile.id),
        getConversationThreadHeader(id, profile.id),
        listMessagesPage({
          conversationId: id,
          userId: profile.id,
        }),
      ]).then(([inboxRows, threadHeader, messagesPage]) => ({
        inbox: inboxRows,
        header: threadHeader,
        page: messagesPage,
      })),
    );

    if (!header || !page) {
      notFound();
    }

    return (
      <div className="px-0 py-0 md:px-4 md:py-4">
        <ChatWorkspace
          userId={profile.id}
          myName={profile.displayName}
          viewerRole={header.viewerRole}
          initialInbox={inbox}
          activeId={id}
          initialHeader={header}
          initialPage={page}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect(`/login?next=/chat/${id}`);
    }
    if (error && typeof error === "object" && "digest" in error) {
      throw error;
    }
    throw error;
  }
}
