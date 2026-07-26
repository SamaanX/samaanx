import { toast } from "sonner";

type ChatMessageToastParams = {
  conversationId: string;
  messageId: string;
  senderName: string;
  preview: string;
  navigate: (href: string) => void;
};

/**
 * Priority toast for live incoming chat — faster than waiting on DB notifications.
 * Deduped per conversation so rapid messages refresh one toast.
 */
export function showChatMessageToast(params: ChatMessageToastParams): void {
  const preview =
    params.preview.trim().slice(0, 120) || "Sent you an attachment";

  toast(`${params.senderName} messaged you`, {
    id: `chat-msg-${params.conversationId}`,
    description: preview,
    duration: 7000,
    action: {
      label: "Open chat",
      onClick: () => params.navigate(`/chat/${params.conversationId}`),
    },
  });
}
