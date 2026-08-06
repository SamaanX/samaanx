"use client";

import {
  BarChart3,
  Flag,
  LayoutDashboard,
  Megaphone,
  MessageSquareHeart,
  Scale,
  ScrollText,
  Search,
  Settings,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/listings", label: "Listings", icon: Shield },
  { href: "/admin/reports", label: "Reports", icon: Flag },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquareHeart },
  { href: "/admin/disputes", label: "Disputes", icon: Scale },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/admin/search", label: "Search", icon: Search },
  { href: "/admin/activity", label: "Activity Log", icon: ScrollText },
  { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
  { href: "/admin/settings", label: "Settings", icon: Settings },
] as const;

type AdminSidebarProps = {
  role: "ADMIN" | "SUPER_ADMIN";
  displayName: string;
};

export function AdminSidebar({ role, displayName }: AdminSidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="border-border/70 bg-card/80 flex h-full w-full flex-col border-r backdrop-blur">
      <div className="border-border/60 border-b px-4 py-5">
        <p className="text-brand-blue text-xs font-semibold tracking-widest uppercase">
          SamaanX Admin
        </p>
        <p className="mt-1 text-sm font-medium">{displayName}</p>
        <p className="text-muted-foreground text-xs">
          {role.replace("_", " ")}
        </p>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => {
          const active =
            "exact" in item && item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-brand-blue-soft text-brand-blue"
                  : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
              )}
            >
              <Icon className="size-4 shrink-0" aria-hidden />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-border/60 border-t p-3">
        <Link
          href="/"
          className="text-muted-foreground hover:bg-muted/60 hover:text-foreground block rounded-xl px-3 py-2 text-sm"
        >
          ← Back to marketplace
        </Link>
      </div>
    </aside>
  );
}
