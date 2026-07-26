"use client";

import { Camera, Trash2 } from "lucide-react";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { deleteAvatarAction } from "@/features/profile/actions/delete-avatar";
import { uploadAvatarAction } from "@/features/profile/actions/upload-avatar";
import { FormMessage } from "@/features/profile/components/form-message";
import {
  AVATAR_ALLOWED_MIME_TYPES,
  AVATAR_MAX_BYTES,
} from "@/features/profile/schemas/profile";
import type { ProfileViewModel } from "@/features/profile/types/profile";
import { cn } from "@/lib/utils";

type AvatarUploaderProps = {
  profile: ProfileViewModel;
  onProfileChange: (profile: ProfileViewModel) => void;
  variant?: "default" | "fab";
};

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((part) => part[0]?.toUpperCase() ?? "").join("") || "R";
}

export function AvatarUploader({
  profile,
  onProfileChange,
  variant = "default",
}: AvatarUploaderProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    setError(null);
    setSuccess(null);

    if (!(AVATAR_ALLOWED_MIME_TYPES as readonly string[]).includes(file.type)) {
      setError("Use a JPEG, PNG, WebP, or AVIF image.");
      return;
    }

    if (file.size > AVATAR_MAX_BYTES) {
      setError("Image must be 2 MB or smaller.");
      return;
    }

    const formData = new FormData();
    formData.set("avatar", file);

    setLoading(true);
    const result = await uploadAvatarAction(formData);
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    onProfileChange(result.data);
    setSuccess("Profile photo updated.");
  }

  async function handleDelete() {
    setError(null);
    setSuccess(null);
    setLoading(true);

    const result = await deleteAvatarAction();
    setLoading(false);

    if (!result.ok) {
      setError(result.error.message);
      return;
    }

    onProfileChange(result.data);
    setSuccess("Profile photo removed.");
  }

  if (variant === "fab") {
    return (
      <>
        <input
          ref={inputRef}
          type="file"
          accept={AVATAR_ALLOWED_MIME_TYPES.join(",")}
          className="sr-only"
          onChange={(event) => void handleFileChange(event)}
        />
        <button
          type="button"
          disabled={loading}
          title={error ?? undefined}
          aria-label={loading ? "Uploading photo" : "Change profile photo"}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "border-border/80 bg-card text-brand-blue inline-flex size-9 items-center justify-center rounded-full border shadow-[var(--rp-shadow-sm)]",
            "hover:bg-brand-blue-soft focus-visible:ring-ring transition-colors focus-visible:ring-2 focus-visible:outline-none",
            "disabled:opacity-60",
            error && "border-destructive/40 text-destructive",
          )}
        >
          <Camera className="size-4" aria-hidden />
        </button>
        {error ? (
          <span className="sr-only" role="alert">
            {error}
          </span>
        ) : null}
      </>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Avatar className="border-border/80 size-16 rounded-2xl border sm:size-[4.5rem]">
          {profile.avatarUrl ? (
            <AvatarImage
              src={profile.avatarUrl}
              alt=""
              className="rounded-2xl object-cover"
            />
          ) : null}
          <AvatarFallback className="bg-brand-blue-soft text-brand-blue rounded-2xl text-lg font-semibold">
            {initials(profile.displayName)}
          </AvatarFallback>
        </Avatar>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept={AVATAR_ALLOWED_MIME_TYPES.join(",")}
              className="sr-only"
              onChange={(event) => void handleFileChange(event)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={loading}
              className="h-10 rounded-xl"
              onClick={() => inputRef.current?.click()}
            >
              <Camera className="size-4" aria-hidden />
              {loading ? "Uploading…" : "Change photo"}
            </Button>
            {profile.avatarUrl ? (
              <Button
                type="button"
                variant="ghost"
                disabled={loading}
                className="text-destructive hover:text-destructive h-10 rounded-xl"
                onClick={() => void handleDelete()}
              >
                <Trash2 className="size-4" aria-hidden />
                Remove
              </Button>
            ) : null}
          </div>
          <p className="text-muted-foreground text-xs">
            JPEG, PNG, WebP, or AVIF · max 2 MB
          </p>
        </div>
      </div>
      <FormMessage message={error} />
      <FormMessage message={success} tone="success" />
    </div>
  );
}
