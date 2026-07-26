import { CheckCircle2, QrCode, ShieldCheck, Sparkles, Zap } from "lucide-react";

import { SamaanXLogo } from "@/components/brand/samaanx-logo";
import { APP_NAME, APP_TAGLINE } from "@/config/constants";

const FEATURES = [
  {
    icon: QrCode,
    label: "Secure QR & PIN Verification",
  },
  {
    icon: ShieldCheck,
    label: "Trusted Community",
  },
  {
    icon: CheckCircle2,
    label: "Easy Rental Management",
  },
  {
    icon: Zap,
    label: "Fast & Simple Experience",
  },
] as const;

/**
 * Desktop-only branding panel for auth split layout.
 * Uses official SamaanX blues/greens — no stock photography.
 */
export function AuthBrandPanel() {
  return (
    <aside
      className="relative hidden w-[45%] shrink-0 overflow-hidden lg:flex lg:flex-col"
      aria-label={`${APP_NAME} brand`}
    >
      <div className="bg-brand-gradient absolute inset-0" />

      {/* Abstract logo-inspired shapes */}
      <div aria-hidden className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-16 size-72 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-1/3 -right-20 size-80 rounded-full bg-white/15 blur-3xl" />
        <div className="absolute bottom-16 left-1/4 size-56 rounded-full bg-white/10 blur-2xl" />
        <div className="absolute top-[18%] left-[12%] size-28 rotate-12 rounded-[28%] border border-white/15 bg-white/5" />
        <div className="absolute right-[14%] bottom-[28%] size-20 rounded-full border border-white/20 bg-white/5" />
        <div className="absolute top-[52%] left-[58%] h-24 w-40 -rotate-6 rounded-3xl border border-white/10 bg-white/[0.04]" />
      </div>

      <div className="relative z-10 flex h-full flex-col justify-between px-10 py-12 xl:px-14 xl:py-14">
        <div className="space-y-8">
          <SamaanXLogo
            href="/"
            priority
            withPlate
            className="[&_img]:h-9 xl:[&_img]:h-10"
          />

          <div className="max-w-md space-y-4">
            <p className="text-2xl font-semibold tracking-tight text-white xl:text-3xl">
              {APP_TAGLINE}
            </p>
            <p className="text-sm leading-relaxed text-white/85 xl:text-[0.95rem]">
              Pakistan&apos;s trusted rental marketplace where you can rent
              items from others or earn money by renting out what you already
              own.
            </p>
          </div>

          <ul className="max-w-md space-y-3">
            {FEATURES.map((feature) => (
              <li
                key={feature.label}
                className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 px-3.5 py-3 backdrop-blur-sm"
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-white/15 text-white">
                  <feature.icon className="size-4" aria-hidden />
                </span>
                <span className="text-sm font-medium text-white">
                  {feature.label}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <p className="flex items-center gap-2 text-sm font-medium text-white/90">
          <Sparkles className="size-4 text-white" aria-hidden />
          Made for Pakistan 🇵🇰
        </p>
      </div>
    </aside>
  );
}
