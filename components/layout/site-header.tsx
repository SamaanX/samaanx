"use client";

import { Menu, Search, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import * as React from "react";

import { SamaanXLogo } from "@/components/brand/samaanx-logo";
import { ModeSwitch } from "@/components/layout/mode-switch";
import { ProfileMenu } from "@/components/layout/profile-menu";
import { buttonVariants } from "@/components/ui/button";
import { HeaderHomeLink } from "@/features/activity/components/activity-banner";
import { ThemeToggle } from "@/features/auth/components/theme-toggle";
import { useChatUnreadTotal } from "@/features/chat/hooks/use-chat-unread-total";
import { FeedbackDialog } from "@/features/feedback/components/feedback-dialog";
import type { ProfileViewModel } from "@/features/profile/types/profile";
import { type AppUiMode, navForMode } from "@/lib/ui/app-mode";
import { cn } from "@/lib/utils";
import { usePreferredMode } from "@/providers/preferred-mode-provider";

type ModeProfile = Pick<
  ProfileViewModel,
  "displayName" | "phone" | "bio" | "city" | "area"
>;

type SiteHeaderProps = {
  isAuthenticated: boolean;
  preferredMode?: AppUiMode;
  modeProfile?: ModeProfile | null;
  avatarUrl?: string | null;
  displayName?: string | null;
  notificationSlot?: React.ReactNode;
  isAdmin?: boolean;
};

const PREFETCH_ROUTES_BUYER = [
  "/",
  "/search",
  "/rentals",
  "/chat",
  "/notifications",
] as const;
const PREFETCH_ROUTES_SELLER = [
  "/",
  "/seller/rentals",
  "/seller/listings",
  "/chat",
  "/notifications",
] as const;

export function SiteHeader({
  isAuthenticated,
  preferredMode = "BUYER",
  modeProfile = null,
  avatarUrl = null,
  displayName = null,
  notificationSlot = null,
  isAdmin = false,
}: SiteHeaderProps) {
  const router = useRouter();
  const { mode } = usePreferredMode(preferredMode);
  const [open, setOpen] = React.useState(false);
  const nav = navForMode(mode, isAuthenticated);
  const isSeller = mode === "SELLER" && isAuthenticated;
  const resolvedName =
    displayName?.trim() || modeProfile?.displayName || "Account";
  const chatUnread = useChatUnreadTotal(isAuthenticated);
  const chatUnreadCount = chatUnread.data ?? 0;

  React.useEffect(() => {
    if (!isAuthenticated) return;
    const routes =
      mode === "SELLER" ? PREFETCH_ROUTES_SELLER : PREFETCH_ROUTES_BUYER;
    for (const href of routes) {
      router.prefetch(href);
    }
  }, [isAuthenticated, mode, router]);

  return (
    <header className="border-border/60 bg-background/90 sticky top-0 z-40 border-b backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <div className="flex items-center gap-1.5">
          <HeaderHomeLink className="md:hidden" />
          <SamaanXLogo priority className="[&_img]:h-7 sm:[&_img]:h-8" />
        </div>

        <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className="text-muted-foreground hover:bg-brand-blue-soft hover:text-brand-blue focus-visible:ring-ring relative rounded-lg px-3 py-2 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {item.label}
              {item.href === "/chat" && chatUnreadCount > 0 ? (
                <span
                  className="bg-brand-green absolute top-1 right-0.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[0.65rem] font-bold text-white"
                  aria-label={`${chatUnreadCount} unread messages`}
                >
                  {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                </span>
              ) : null}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          {isAuthenticated ? (
            <span
              className={cn(
                "hidden rounded-full px-2.5 py-1 text-[0.7rem] font-semibold tracking-wide uppercase sm:inline-flex",
                isSeller
                  ? "bg-brand-green-soft text-brand-green"
                  : "bg-brand-blue-soft text-brand-blue",
              )}
              aria-label={isSeller ? "Seller mode" : "Buyer mode"}
            >
              {isSeller ? "Seller" : "Buyer"}
            </span>
          ) : null}

          {isAuthenticated && modeProfile ? (
            <ModeSwitch
              preferredMode={preferredMode}
              profile={modeProfile}
              className="hidden lg:inline-flex"
            />
          ) : null}

          {isAuthenticated ? notificationSlot : null}

          {isAuthenticated ? (
            <FeedbackDialog
              variant="ghost"
              size="icon"
              iconOnly
              triggerClassName="hidden sm:inline-flex"
            />
          ) : null}

          {!isSeller ? (
            <Link
              href="/search"
              prefetch
              className="text-brand-blue hover:bg-brand-blue-soft focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none md:hidden"
              aria-label="Search"
            >
              <Search className="size-5" aria-hidden />
            </Link>
          ) : null}

          <ThemeToggle />

          {isAuthenticated ? (
            <ProfileMenu
              displayName={resolvedName}
              avatarUrl={avatarUrl}
              preferredMode={mode}
              isAdmin={isAdmin}
            />
          ) : (
            <Link
              href="/login"
              prefetch
              className={cn(
                buttonVariants({ size: "sm" }),
                "hidden sm:inline-flex",
              )}
            >
              Sign in
            </Link>
          )}

          <button
            type="button"
            className="text-foreground hover:bg-muted focus-visible:ring-ring inline-flex size-10 items-center justify-center rounded-xl focus-visible:ring-2 focus-visible:outline-none md:hidden"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? "Close menu" : "Open menu"}
            onClick={() => setOpen((value) => !value)}
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {isAuthenticated ? (
        <div
          className={cn(
            "border-t px-4 py-1.5 text-center text-xs font-medium sm:px-6",
            isSeller
              ? "border-brand-green/20 bg-brand-green-soft/50 text-brand-green"
              : "border-brand-blue/20 bg-brand-blue-soft/50 text-brand-blue",
          )}
          role="status"
        >
          {isSeller
            ? "Seller mode — manage listings and rental requests"
            : "Buyer mode — browse and rent items nearby"}
        </div>
      ) : null}

      {open ? (
        <nav
          id="mobile-nav"
          className="border-border/60 border-t px-4 py-3 md:hidden"
          aria-label="Mobile"
        >
          {isAuthenticated && modeProfile ? (
            <div className="mb-3 flex justify-center">
              <ModeSwitch preferredMode={preferredMode} profile={modeProfile} />
            </div>
          ) : null}
          <ul className="space-y-1">
            {nav
              .filter((item) => {
                if (item.href === "/" || item.href === "/search") return false;
                if (
                  isAuthenticated &&
                  mode === "BUYER" &&
                  (item.href === "/rentals" || item.href === "/wishlist")
                ) {
                  return false;
                }
                if (
                  isAuthenticated &&
                  mode === "SELLER" &&
                  (item.href === "/seller/listings" ||
                    item.href === "/seller/rentals")
                ) {
                  return false;
                }
                return true;
              })
              .map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch
                    onClick={() => setOpen(false)}
                    className="hover:bg-brand-blue-soft hover:text-brand-blue flex items-center justify-between rounded-xl px-3 py-3 text-sm font-medium"
                  >
                    <span>{item.label}</span>
                    {item.href === "/chat" && chatUnreadCount > 0 ? (
                      <span className="bg-brand-green inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[0.7rem] font-bold text-white">
                        {chatUnreadCount > 9 ? "9+" : chatUnreadCount}
                      </span>
                    ) : null}
                  </Link>
                </li>
              ))}
            {isAuthenticated ? (
              <>
                <li>
                  <Link
                    href="/notifications"
                    prefetch
                    onClick={() => setOpen(false)}
                    className="hover:bg-brand-blue-soft hover:text-brand-blue block rounded-xl px-3 py-3 text-sm font-medium"
                  >
                    Notifications
                  </Link>
                </li>
                <li className="hidden md:list-item">
                  <Link
                    href="/wishlist"
                    prefetch
                    onClick={() => setOpen(false)}
                    className="hover:bg-brand-blue-soft hover:text-brand-blue block rounded-xl px-3 py-3 text-sm font-medium"
                  >
                    Wishlist
                  </Link>
                </li>
                <li>
                  <Link
                    href="/feedback"
                    prefetch
                    onClick={() => setOpen(false)}
                    className="hover:bg-brand-blue-soft hover:text-brand-blue block rounded-xl px-3 py-3 text-sm font-medium"
                  >
                    Send feedback
                  </Link>
                </li>
                <li>
                  <Link
                    href="/help"
                    prefetch
                    onClick={() => setOpen(false)}
                    className="hover:bg-brand-blue-soft hover:text-brand-blue block rounded-xl px-3 py-3 text-sm font-medium"
                  >
                    Help
                  </Link>
                </li>
              </>
            ) : (
              <li>
                <Link
                  href="/login"
                  prefetch
                  onClick={() => setOpen(false)}
                  className="hover:bg-brand-blue-soft hover:text-brand-blue block rounded-xl px-3 py-3 text-sm font-medium"
                >
                  Sign in
                </Link>
              </li>
            )}
          </ul>
        </nav>
      ) : null}
    </header>
  );
}
