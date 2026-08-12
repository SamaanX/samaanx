import type { Metadata } from "next";

import { AiAssistantClient } from "@/features/ai/components/ai-assistant-client";

export const metadata: Metadata = {
  title: "AI Assistant",
  description:
    "SamaanX AI Rental Assistant — discover rentals using live marketplace data.",
};

export default function AiAssistantPage() {
  return (
    <div className="flex min-h-[calc(100dvh-4rem)] flex-col">
      <AiAssistantClient />
    </div>
  );
}
