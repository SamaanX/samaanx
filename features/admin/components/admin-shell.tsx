"use client";

import { Menu } from "lucide-react";
import * as React from "react";

import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { useAdminRealtime } from "@/features/admin/hooks/use-admin-realtime";

type AdminShellProps = {
  role: "ADMIN" | "SUPER_ADMIN";
  displayName: string;
  children: React.ReactNode;
};

export function AdminShell({ role, displayName, children }: AdminShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  useAdminRealtime();

  return (
    <div className="bg-background min-h-dvh">
      <div className="mx-auto flex min-h-dvh max-w-[1600px]">
        <div className="hidden w-64 shrink-0 lg:block">
          <AdminSidebar role={role} displayName={displayName} />
        </div>

        {mobileOpen ? (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              className="absolute inset-0 bg-black/40"
              onClick={() => setMobileOpen(false)}
            />
            <div className="bg-card relative z-10 h-full w-64">
              <AdminSidebar role={role} displayName={displayName} />
            </div>
          </div>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="border-border/70 bg-background/90 sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 backdrop-blur lg:px-6">
            <button
              type="button"
              className="border-border rounded-lg border p-2 lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open admin menu"
            >
              <Menu className="size-4" />
            </button>
            <div>
              <p className="text-sm font-semibold">Operations Center</p>
              <p className="text-muted-foreground text-xs">
                Manage users, listings, reports & disputes
              </p>
            </div>
          </header>
          <main className="flex-1 px-4 py-6 lg:px-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
