"use client";

import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

import { BrandTagline } from "@/components/brand/brand-tagline";
import { SamaanXLogo } from "@/components/brand/samaanx-logo";
import { buttonVariants } from "@/components/ui/button";
import { APP_NAME } from "@/config/constants";
import { clearWelcomePending } from "@/features/auth/lib/welcome-session";
import type { ProfileViewModel } from "@/features/profile/types/profile";
import { savePreferredMode } from "@/features/profile/utils/save-preferred-mode";
import { cn } from "@/lib/utils";

type WelcomeProfile = Pick<
  ProfileViewModel,
  "displayName" | "phone" | "bio" | "city" | "area"
>;

type WelcomeScreenProps = {
  profile: WelcomeProfile;
};

type Choice = "BUYER" | "SELLER";

export function WelcomeScreen({ profile: _profile }: WelcomeScreenProps) {
  const router = useRouter();
  const [pending, setPending] = React.useState<Choice | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  async function choose(mode: Choice) {
    if (pending) return;
    setPending(mode);
    setError(null);

    const result = await savePreferredMode(mode);

    if (!result.ok) {
      setError(result.error.message);
      setPending(null);
      return;
    }

    clearWelcomePending();

    if (mode === "SELLER") {
      router.replace("/seller/listings");
    } else {
      router.replace("/");
    }
  }

  return (
    <div className="bg-background fixed inset-0 z-50 overflow-y-auto">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 overflow-hidden"
      >
        <div className="bg-brand-blue/12 absolute -top-24 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full blur-3xl" />
        <div className="bg-brand-green/12 absolute right-0 bottom-0 h-64 w-64 translate-x-1/4 translate-y-1/4 rounded-full blur-3xl" />
      </div>

      <div className="relative mx-auto flex min-h-dvh w-full max-w-3xl flex-col justify-center px-4 py-10 sm:px-6 sm:py-14">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
          className="text-center"
        >
          <SamaanXLogo
            href={null}
            priority
            className="mx-auto [&_img]:h-8 sm:[&_img]:h-9"
          />
          <h1 className="text-foreground mt-8 text-3xl font-semibold tracking-tight sm:text-4xl">
            Welcome to {APP_NAME} 👋
          </h1>
          <BrandTagline
            multiline
            className="text-muted-foreground mt-3 text-base font-medium sm:text-lg"
          />
          <p className="text-muted-foreground mt-5 text-sm sm:text-base">
            What would you like to do today?
          </p>
        </motion.div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 sm:gap-5">
          <WelcomeCard
            emoji="🛒"
            title="Rent an Item"
            body="Browse thousands of items available near you."
            actionLabel="Browse Rentals"
            onAction={() => void choose("BUYER")}
            loading={pending === "BUYER"}
            disabled={pending !== null}
            accent="blue"
            delay={0.08}
          />
          <WelcomeCard
            emoji="💰"
            title="Rent Out My Item"
            body={`Turn your unused items into income by listing them on ${APP_NAME}.`}
            actionLabel="Start Selling"
            onAction={() => void choose("SELLER")}
            loading={pending === "SELLER"}
            disabled={pending !== null}
            accent="green"
            delay={0.14}
          />
        </div>

        <p className="text-muted-foreground mt-8 text-center text-sm">
          You can switch between Buyer and Seller anytime.
        </p>

        {error ? (
          <p className="text-destructive mt-4 text-center text-sm" role="alert">
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}

type WelcomeCardProps = {
  emoji: string;
  title: string;
  body: string;
  actionLabel: string;
  onAction: () => void;
  loading: boolean;
  disabled: boolean;
  accent: "blue" | "green";
  delay: number;
};

function WelcomeCard({
  emoji,
  title,
  body,
  actionLabel,
  onAction,
  loading,
  disabled,
  accent,
  delay,
}: WelcomeCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "bg-card flex flex-col rounded-3xl border p-6 shadow-[var(--rp-shadow-md)] sm:p-7",
        accent === "blue" ? "border-brand-blue/25" : "border-brand-green/25",
      )}
    >
      <div
        className={cn(
          "flex size-14 items-center justify-center rounded-2xl text-2xl",
          accent === "blue" ? "bg-brand-blue-soft" : "bg-brand-green-soft",
        )}
        aria-hidden
      >
        {emoji}
      </div>
      <h2 className="mt-5 text-xl font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground mt-2 flex-1 text-sm leading-relaxed">
        {body}
      </p>
      <button
        type="button"
        disabled={disabled}
        onClick={onAction}
        className={cn(
          buttonVariants({ size: "lg" }),
          "mt-6 w-full",
          accent === "green" &&
            "bg-brand-green hover:bg-brand-green/90 text-white",
        )}
      >
        {loading ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden />
            <span>Please wait…</span>
          </>
        ) : (
          actionLabel
        )}
      </button>
    </motion.div>
  );
}
