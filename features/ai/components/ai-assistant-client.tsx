"use client";

import { Loader2, Send, Sparkles, Trash2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { AiChatMessage } from "@/features/ai/types/ai-chat";
import { cn } from "@/lib/utils";

const SUGGESTED_PROMPTS = [
  "Find a camera under Rs. 5000",
  "Show me laptops for rent",
  "What can I rent on SamaanX?",
  "Find rentals in Lahore",
  "Find something under Rs. 2000/day",
] as const;

const UNAVAILABLE_MESSAGE =
  "Sorry, the AI assistant is temporarily unavailable. Please try again.";

export function AiAssistantClient() {
  const [messages, setMessages] = React.useState<AiChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

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

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:px-6">
      <div className="border-border/70 bg-card mb-4 rounded-2xl border p-4 shadow-sm sm:p-5">
        <div className="flex items-start gap-3">
          <div className="bg-brand-blue-soft text-brand-blue flex size-10 shrink-0 items-center justify-center rounded-xl">
            <Sparkles className="size-5" aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">
              SamaanX AI Rental Assistant
            </h1>
            <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
              Ask about rentals on SamaanX. Recommendations use live marketplace
              listings — not made-up products.
            </p>
          </div>
          {messages.length > 0 ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="shrink-0"
              onClick={() => {
                setMessages([]);
                setError(null);
                setInput("");
              }}
            >
              <Trash2 className="size-4" aria-hidden />
              Clear
            </Button>
          ) : null}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="border-border/70 bg-card/80 mb-4 min-h-[320px] flex-1 overflow-y-auto rounded-2xl border p-4 sm:min-h-[420px] sm:p-5"
        aria-live="polite"
      >
        {messages.length === 0 && !loading && !error ? (
          <div className="flex h-full flex-col justify-center gap-4 py-6">
            <p className="text-muted-foreground text-center text-sm">
              Try one of these prompts to get started:
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  className="bg-muted/60 hover:bg-brand-blue-soft hover:text-brand-blue rounded-full px-3 py-2 text-sm transition-colors"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
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
                    "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap sm:max-w-[80%]",
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
                <div className="bg-muted/70 border-border/60 inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm">
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Thinking…
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="border-destructive/30 bg-destructive/5 text-destructive rounded-xl border px-4 py-3 text-sm">
                {error}
              </div>
            ) : null}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="sticky bottom-0 pb-2">
        <div className="border-border/70 bg-card flex items-end gap-2 rounded-2xl border p-3 shadow-sm">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about cameras, laptops, budgets, cities…"
            rows={2}
            maxLength={1000}
            disabled={loading}
            className="min-h-[52px] flex-1 resize-none border-0 bg-transparent px-2 py-2 shadow-none focus-visible:ring-0"
            aria-label="Message to SamaanX AI"
          />
          <Button
            type="submit"
            size="icon"
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
        <p className="text-muted-foreground mt-2 text-center text-xs">
          Shift+Enter for a new line. Max 1000 characters.
        </p>
      </form>
    </div>
  );
}
