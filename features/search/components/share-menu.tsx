"use client";

import { Check, Copy, Facebook, Linkedin, Share2 } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import { trackEvent } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";

type ShareMenuProps = {
  title: string;
  slug: string;
  className?: string;
};

function buildShareUrl(slug: string): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/listings/${slug}`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return `${base}/listings/${slug}`;
}

function encode(text: string): string {
  return encodeURIComponent(text);
}

export function ShareMenu({ title, slug, className }: ShareMenuProps) {
  const [open, setOpen] = React.useState(false);
  const [copied, setCopied] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const canNativeShare =
    typeof navigator !== "undefined" && typeof navigator.share === "function";

  React.useEffect(() => {
    if (!open) return;
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  function trackShare(channel: string) {
    trackEvent("share_listing", { channel, slug });
  }

  async function nativeShare() {
    const url = buildShareUrl(slug);
    try {
      await navigator.share({ title, url });
      trackShare("native");
      setOpen(false);
    } catch {
      // User cancelled
    }
  }

  async function copyLink() {
    const url = buildShareUrl(slug);
    await navigator.clipboard.writeText(url);
    setCopied(true);
    trackShare("copy");
    setTimeout(() => setCopied(false), 2000);
  }

  function openWindow(href: string, channel: string) {
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=520");
    trackShare(channel);
    setOpen(false);
  }

  const url = buildShareUrl(slug);
  const text = `${title} on SamaanX`;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Share listing"
        onClick={() => setOpen((v) => !v)}
      >
        <Share2 className="size-4" aria-hidden />
        {copied ? "Copied" : "Share"}
      </Button>

      {open ? (
        <div
          role="menu"
          aria-label="Share options"
          className="border-border/80 bg-card absolute right-0 z-20 mt-2 w-52 rounded-xl border p-1.5 shadow-lg"
        >
          {canNativeShare ? (
            <ShareItem label="Share…" onClick={() => void nativeShare()} />
          ) : null}
          <ShareItem
            label="WhatsApp"
            onClick={() =>
              openWindow(
                `https://wa.me/?text=${encode(`${text} ${url}`)}`,
                "whatsapp",
              )
            }
          />
          <ShareItem
            label="Facebook"
            icon={<Facebook className="size-3.5" aria-hidden />}
            onClick={() =>
              openWindow(
                `https://www.facebook.com/sharer/sharer.php?u=${encode(url)}`,
                "facebook",
              )
            }
          />
          <ShareItem
            label="X (Twitter)"
            onClick={() =>
              openWindow(
                `https://twitter.com/intent/tweet?text=${encode(text)}&url=${encode(url)}`,
                "twitter",
              )
            }
          />
          <ShareItem
            label="LinkedIn"
            icon={<Linkedin className="size-3.5" aria-hidden />}
            onClick={() =>
              openWindow(
                `https://www.linkedin.com/sharing/share-offsite/?url=${encode(url)}`,
                "linkedin",
              )
            }
          />
          <ShareItem
            label={copied ? "Copied!" : "Copy link"}
            icon={
              copied ? (
                <Check className="text-brand-green size-3.5" aria-hidden />
              ) : (
                <Copy className="size-3.5" aria-hidden />
              )
            }
            onClick={() => void copyLink()}
          />
        </div>
      ) : null}
    </div>
  );
}

function ShareItem({
  label,
  icon,
  onClick,
}: {
  label: string;
  icon?: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      className="hover:bg-muted flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm"
      onClick={onClick}
    >
      {icon}
      {label}
    </button>
  );
}
