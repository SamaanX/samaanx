"use client";

import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

type AuthCardProps = {
  children: React.ReactNode;
  className?: string;
};

export function AuthCard({ children, className }: AuthCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
      className={cn(
        "border-border/70 bg-card w-full rounded-3xl border p-6 shadow-[var(--rp-shadow-lg)] sm:p-8",
        className,
      )}
    >
      {children}
    </motion.div>
  );
}
