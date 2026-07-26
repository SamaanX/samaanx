"use client";

import { Camera, Paperclip, SendHorizontal, Smile, X } from "lucide-react";
import dynamic from "next/dynamic";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { ChatMessageView } from "@/features/chat/types/chat";
import { cn } from "@/lib/utils";

const EmojiPicker = dynamic(
  () => import("emoji-picker-react").then((m) => m.default),
  {
    ssr: false,
    loading: () => (
      <div className="bg-muted h-72 w-full animate-pulse rounded-xl" />
    ),
  },
);

type ChatComposerProps = {
  disabled?: boolean;
  readonlyHint?: string;
  replyTo: ChatMessageView | null;
  onClearReply: () => void;
  onTyping: () => void;
  onSendText: (body: string) => Promise<void>;
  onSendFile: (file: File, body?: string) => Promise<void>;
};

export function ChatComposer({
  disabled,
  readonlyHint,
  replyTo,
  onClearReply,
  onTyping,
  onSendText,
  onSendFile,
}: ChatComposerProps) {
  const [text, setText] = React.useState("");
  const [emojiOpen, setEmojiOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const [progress, setProgress] = React.useState(0);
  const fileRef = React.useRef<HTMLInputElement>(null);
  const cameraRef = React.useRef<HTMLInputElement>(null);

  async function submit() {
    const body = text.trim();
    if (!body || disabled || uploading) return;
    setText("");
    setEmojiOpen(false);
    await onSendText(body);
  }

  async function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file || disabled) return;
    setUploading(true);
    setProgress(15);
    const timer = window.setInterval(() => {
      setProgress((p) => Math.min(p + 12, 90));
    }, 200);
    try {
      await onSendFile(file, text.trim());
      setText("");
      setProgress(100);
    } finally {
      window.clearInterval(timer);
      setUploading(false);
      setProgress(0);
      if (fileRef.current) fileRef.current.value = "";
      if (cameraRef.current) cameraRef.current.value = "";
    }
  }

  if (disabled) {
    return (
      <div className="border-border/60 bg-muted/30 text-muted-foreground border-t px-4 py-3 text-center text-sm">
        {readonlyHint ?? "This conversation is read-only."}
      </div>
    );
  }

  return (
    <div className="border-border/60 bg-background border-t px-3 py-2.5 sm:px-4">
      {replyTo ? (
        <div className="border-border bg-muted/40 mb-2 flex items-start justify-between gap-2 rounded-xl border px-3 py-2 text-xs">
          <div className="min-w-0">
            <p className="text-brand-blue font-semibold">Replying</p>
            <p className="text-muted-foreground line-clamp-2">
              {replyTo.body ||
                (replyTo.attachment ? replyTo.attachment.name : "Attachment")}
            </p>
          </div>
          <button
            type="button"
            aria-label="Cancel reply"
            onClick={onClearReply}
            className="hover:bg-muted rounded-lg p-1"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {uploading ? (
        <div className="bg-muted mb-2 h-1.5 overflow-hidden rounded-full">
          <div
            className="bg-brand-green h-full transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      ) : null}

      {emojiOpen ? (
        <div className="border-border mb-2 overflow-hidden rounded-xl border">
          <EmojiPicker
            width="100%"
            height={280}
            onEmojiClick={(emoji) => {
              setText((t) => `${t}${emoji.emoji}`);
              onTyping();
            }}
            previewConfig={{ showPreview: false }}
          />
        </div>
      ) : null}

      <div className="flex items-end gap-1.5">
        <button
          type="button"
          aria-label="Emoji"
          onClick={() => setEmojiOpen((v) => !v)}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-10 items-center justify-center rounded-xl"
        >
          <Smile className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Attach file"
          onClick={() => fileRef.current?.click()}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-10 items-center justify-center rounded-xl"
        >
          <Paperclip className="size-5" />
        </button>
        <button
          type="button"
          aria-label="Camera"
          onClick={() => cameraRef.current?.click()}
          className="text-muted-foreground hover:bg-muted hover:text-foreground inline-flex size-10 items-center justify-center rounded-xl md:hidden"
        >
          <Camera className="size-5" />
        </button>
        <input
          ref={fileRef}
          type="file"
          className="hidden"
          accept="image/jpeg,image/png,image/webp,image/gif,application/pdf,.doc,.docx,.txt,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain"
          onChange={(e) => void handleFiles(e.target.files)}
        />
        <input
          ref={cameraRef}
          type="file"
          className="hidden"
          accept="image/*"
          capture="environment"
          onChange={(e) => void handleFiles(e.target.files)}
        />

        <Textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            onTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder="Type a message"
          rows={1}
          className={cn(
            "max-h-32 min-h-10 flex-1 resize-none rounded-xl py-2.5",
          )}
        />
        <Button
          type="button"
          size="icon"
          className="bg-brand-gradient size-10 shrink-0 rounded-xl text-white"
          disabled={!text.trim() || uploading}
          onClick={() => void submit()}
          aria-label="Send"
        >
          <SendHorizontal className="size-4" />
        </Button>
      </div>
    </div>
  );
}
