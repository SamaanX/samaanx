"use client";

import { usePathname, useRouter } from "next/navigation";

import { useChatUserRealtime } from "@/features/chat/hooks/use-chat";

/**
 * Keeps chat broadcast alive on every authenticated page (home, listings, etc.)
 * so incoming messages toast instantly and delivered ticks fire without opening /chat.
 */
export function ChatRealtimeHost({ userId }: { userId: string | null }) {
  const router = useRouter();
  const pathname = usePathname();

  useChatUserRealtime(userId, {
    showToasts: true,
    pathname,
    navigate: (href) => router.push(href),
  });

  return null;
}
