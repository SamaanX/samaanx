"use client";

import { useQuery } from "@tanstack/react-query";

import { getChatUnreadTotalAction } from "@/features/chat/actions/chat-actions";
import { queryKeys } from "@/lib/query-keys";

export function useChatUnreadTotal(enabled: boolean) {
  return useQuery({
    queryKey: queryKeys.chat.unreadTotal(),
    queryFn: async () => {
      const result = await getChatUnreadTotalAction();
      if (!result.ok) return 0;
      return result.data;
    },
    enabled,
    staleTime: 60_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev ?? 0,
  });
}
