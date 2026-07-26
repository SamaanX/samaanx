"use client";

import { Toaster } from "sonner";

import { QueryProvider } from "@/providers/query-provider";
import { ThemeProvider } from "@/providers/theme-provider";

export function AppProviders({ children }: { children: React.ReactNode }) {
  return (
    <QueryProvider>
      <ThemeProvider>
        {children}
        <Toaster
          position="top-center"
          richColors
          closeButton
          toastOptions={{
            classNames: {
              toast:
                "border border-border/80 bg-card text-foreground shadow-[var(--rp-shadow-md)]",
              title: "font-semibold",
              description: "text-muted-foreground",
              actionButton: "bg-brand-blue text-white hover:bg-brand-blue/90!",
            },
          }}
        />
      </ThemeProvider>
    </QueryProvider>
  );
}
