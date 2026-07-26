"use client";

import Link from "next/link";
import * as React from "react";

import { SamaanXLogo } from "@/components/brand/samaanx-logo";
import { Button, buttonVariants } from "@/components/ui/button";
import { signOutAction } from "@/features/auth/actions/sign-out";
import { cn } from "@/lib/utils";

type AdminAccessDeniedProps = {
  email: string;
};

export function AdminAccessDenied({ email }: AdminAccessDeniedProps) {
  const [signingOut, setSigningOut] = React.useState(false);

  async function handleSignOut() {
    setSigningOut(true);
    await signOutAction();
    window.location.assign("/admin");
  }

  return (
    <div className="bg-background flex min-h-dvh flex-col items-center justify-center px-4 py-10">
      <div className="border-border/70 bg-card w-full max-w-md rounded-3xl border p-6 text-center shadow-[var(--rp-shadow-lg)] sm:p-8">
        <div className="mb-6 flex justify-center">
          <SamaanXLogo href="/" className="[&_img]:h-8" />
        </div>

        <h1 className="text-foreground text-xl font-semibold">
          Admin access required
        </h1>
        <p className="text-muted-foreground mt-3 text-sm leading-relaxed">
          Signed in as{" "}
          <span className="text-foreground font-medium">{email}</span>, but this
          account is not authorized for the admin panel.
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            type="button"
            variant="outline"
            onClick={handleSignOut}
            disabled={signingOut}
          >
            {signingOut ? "Signing out…" : "Use another account"}
          </Button>
          <Link href="/" className={cn(buttonVariants({ variant: "default" }))}>
            Go to marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
