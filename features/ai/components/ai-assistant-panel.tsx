"use client";

import { Loader2, Send, Sparkles, Trash2, X } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AiChatMessage } from "@/features/ai/types/ai-chat";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "Find a camera under Rs. 5000",
  "Show me laptops for rent",
  "Find rentals in Lahore",
  "What can I rent on SamaanX?",
] as const;

const UNAVAILABLE_MESSAGE =
  "Sorry, the AI assistant is temporarily unavailable. Please try again.";

type AiAssistantPanelProps = {
  onClose: () => void;
};

export function AiAssistantPanel({ onClose }: AiAssistantPanelProps) {
  const [messages, setMessages] = React.useState<AiChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  React.useEffect(() => {
    inputRef.current?.focus();
  }, []);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading, error]);

  async function sendMessage(rawMessage: string) {
    const message = rawMessage.trim();
    if (!message || loading) return;

    setError(null);
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setLoading(true);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ message }),
      });

      const payload = (await response.json()) as
        | { ok: true; data: { message: string } }
        | { ok: false; error: { message: string } };

      if (!response.ok || !payload.ok) {
        const friendly =
          payload.ok === false && payload.error.message
            ? payload.error.message
            : UNAVAILABLE_MESSAGE;
        setError(friendly);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: payload.data.message },
      ]);
    } catch {
      setError(UNAVAILABLE_MESSAGE);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    void sendMessage(input);
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  }

  function clearChat() {
    setMessages([]);
    setError(null);
    setInput("");
    inputRef.current?.focus();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="border-border/60 flex shrink-0 items-start justify-between gap-3 border-b px-4 py-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="bg-brand-blue-soft text-brand-blue flex size-8 shrink-0 items-center justify-center rounded-lg">
              <Sparkles className="size-4" aria-hidden />
            </div>
            <div>
              <h2 className="text-sm font-semibold tracking-tight">
                SamaanX AI
              </h2>
              <p className="text-muted-foreground text-xs">
                Your rental assistant
              </p>
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {messages.length > 0 ? (
            <button
              type="button"
              onClick={clearChat}
              className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-lg transition-colors"
              aria-label="Clear chat"
              title="Clear chat"
            >
              <Trash2 className="size-4" aria-hidden />
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-8 items-center justify-center rounded-lg transition-colors"
            aria-label="Close SamaanX AI"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      </header>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        aria-live="polite"
      >
        {messages.length === 0 && !loading && !error ? (
          <div className="flex h-full flex-col justify-center gap-4 py-2">
            <div className="text-center">
              <p className="text-sm font-medium">Hi! I&apos;m SamaanX AI 👋</p>
              <p className="text-muted-foreground mt-1 text-sm">
                I can help you find the right rental.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={loading}
                  className="bg-muted/60 hover:bg-brand-blue-soft hover:text-brand-blue rounded-full px-3 py-2 text-left text-xs transition-colors sm:text-sm"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message, index) => (
              <div
                key={`${message.role}-${index}`}
                className={cn(
                  "flex",
                  message.role === "user" ? "justify-end" : "justify-start",
                )}
              >
                <div
                  className={cn(
                    "max-w-[88%] rounded-2xl px-3 py-2.5 text-sm leading-relaxed break-words whitespace-pre-wrap",
                    message.role === "user"
                      ? "bg-brand-blue text-white"
                      : "bg-muted/70 text-foreground border-border/60 border",
                  )}
                >
                  {message.content}
                </div>
              </div>
            ))}

            {loading ? (
              <div className="flex justify-start">
                <div className="bg-muted/70 border-border/60 inline-flex items-center gap-2 rounded-2xl border px-3 py-2 text-sm">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Thinking…
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border px-3 py-2 text-sm">
                {error}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <footer className="border-border/60 shrink-0 border-t p-3">
        <form onSubmit={handleSubmit}>
          <div className="border-border/70 bg-background flex items-end gap-2 rounded-xl border p-2">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about rentals…"
              rows={1}
              maxLength={1000}
              disabled={loading}
              className="max-h-24 min-h-[40px] flex-1 resize-none border-0 bg-transparent px-2 py-2 text-sm shadow-none focus-visible:ring-0"
              aria-label="Message to SamaanX AI"
            />
            <Button
              type="submit"
              size="icon-sm"
              disabled={loading || input.trim().length === 0}
              aria-label="Send message"
              className="shrink-0"
            >
              {loading ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Send className="size-4" aria-hidden />
              )}
            </Button>
          </div>
        </form>
      </footer>
    </div>
  );
}
