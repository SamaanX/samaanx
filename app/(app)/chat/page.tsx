import { redirect } from "next/navigation";

import { ChatWorkspace } from "@/features/chat/components/chat-workspace";
import { listConversationsForUser } from "@/features/chat/queries/conversations";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";
import { withPerf } from "@/lib/perf";

export const metadata = {
  title: "Messages",
  description: "Rental conversations on SamaanX",
};

export default async function ChatInboxPage() {
  try {
    const { profile } = await requireUser();
    const inbox = await withPerf("route.chat.inbox", () =>
      listConversationsForUser(profile.id),
    );

    return (
      <div className="px-0 py-0 md:px-4 md:py-4">
        <ChatWorkspace
          userId={profile.id}
          myName={profile.displayName}
          viewerRole={profile.preferredMode === "SELLER" ? "seller" : "buyer"}
          initialInbox={inbox}
        />
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect("/login?next=/chat");
    }
    throw error;
  }
}
