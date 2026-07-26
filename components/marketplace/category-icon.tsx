"use client";

import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  Baby,
  Bike,
  BookOpen,
  Camera,
  Car,
  Cpu,
  Dumbbell,
  Gamepad2,
  Laptop,
  LayoutGrid,
  Music,
  PartyPopper,
  Refrigerator,
  Shirt,
  Smartphone,
  Wrench,
} from "lucide-react";

import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, LucideIcon> = {
  Cpu,
  Smartphone,
  Laptop,
  Camera,
  Car,
  Bike,
  Armchair,
  Refrigerator,
  Gamepad2,
  Dumbbell,
  Shirt,
  Wrench,
  Music,
  PartyPopper,
  Baby,
  BookOpen,
  LayoutGrid,
};

type CategoryIconProps = {
  name: string | null;
  className?: string;
};

export function CategoryIcon({ name, className }: CategoryIconProps) {
  const Icon = (name && ICON_MAP[name]) || LayoutGrid;
  return (
    <Icon className={cn("text-brand-blue size-5", className)} aria-hidden />
  );
}
