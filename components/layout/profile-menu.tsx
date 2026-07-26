"use client";

import {
  CircleHelp,
  Heart,
  LayoutDashboard,
  LogOut,
  Package,
  Settings,
  Shield,
  UserRound,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { signOutAction } from "@/features/auth/actions/sign-out";
import type { AppUiMode } from "@/lib/ui/app-mode";
import { cn } from "@/lib/utils";

type ProfileMenuProps = {
  displayName: string;
  avatarUrl: string | null;
  preferredMode: AppUiMode;
  isAdmin?: boolean;
  className?: string;
};

const MENU_ITEMS = [
  { href: "/profile", label: "My Profile", icon: UserRound },
  { href: "/rentals", label: "My Rentals", icon: Package },
  { href: "/seller/listings", label: "My Listings", icon: LayoutDashboard },
  { href: "/wishlist", label: "Wishlist", icon: Heart },
  { href: "/profile#account", label: "Settings", icon: Settings },
  { href: "/help", label: "Help", icon: CircleHelp },
] as const;

export function ProfileMenu({
  displayName,
  avatarUrl,
  preferredMode,
  isAdmin = false,
  className,
}: ProfileMenuProps) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);
  const isSeller = preferredMode === "SELLER";
  const initials = displayName.trim().slice(0, 1).toUpperCase() || "S";

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function handleSignOut() {
    setSigningOut(true);
    const result = await signOutAction();
    setSigningOut(false);
    setOpen(false);
    if (result.ok) {
      router.replace("/login");
      router.refresh();
    }
  }

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Open profile menu"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          "inline-flex size-10 items-center justify-center rounded-full",
          "ring-offset-background transition-opacity hover:opacity-90",
          "focus-visible:ring-ring focus-visible:ring-2 focus-visible:outline-none",
        )}
      >
        <Avatar size="default" className="size-9">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt="" /> : null}
          <AvatarFallback className="bg-brand-blue-soft text-brand-blue text-sm font-semibold">
            {initials}
          </AvatarFallback>
        </Avatar>
      </button>

      {open ? (
        <div
          role="menu"
          aria-label="Profile menu"
          className={cn(
            "absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-2xl",
            "border-border/80 bg-card border shadow-[var(--rp-shadow-md)]",
          )}
        >
          <div className="border-border/60 border-b px-3.5 py-3">
            <p className="text-foreground truncate text-sm font-semibold">
              {displayName}
            </p>
            <p className="text-muted-foreground mt-0.5 text-xs">
              {isSeller ? "Seller mode" : "Buyer mode"}
            </p>
          </div>

          <ul className="py-1.5">
            {isAdmin ? (
              <li>
                <Link
                  href="/admin"
                  role="menuitem"
                  prefetch
                  onClick={() => setOpen(false)}
                  className="text-brand-blue hover:bg-brand-blue-soft flex min-h-11 items-center gap-2.5 px-3.5 text-sm font-medium transition-colors"
                >
                  <Shield className="size-4 shrink-0 opacity-80" aria-hidden />
                  Admin Center
                </Link>
              </li>
            ) : null}
            {MENU_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    role="menuitem"
                    prefetch
                    onClick={() => setOpen(false)}
                    className="text-foreground hover:bg-brand-blue-soft hover:text-brand-blue flex min-h-11 items-center gap-2.5 px-3.5 text-sm font-medium transition-colors"
                  >
                    <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>

          <div className="border-border/60 border-t p-1.5">
            <button
              type="button"
              role="menuitem"
              disabled={signingOut}
              onClick={() => void handleSignOut()}
              className="text-destructive hover:bg-destructive/10 flex min-h-11 w-full items-center gap-2.5 rounded-xl px-2.5 text-sm font-medium transition-colors disabled:opacity-60"
            >
              <LogOut className="size-4 shrink-0" aria-hidden />
              {signingOut ? "Signing out…" : "Logout"}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
