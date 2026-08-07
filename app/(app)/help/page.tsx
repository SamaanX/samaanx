import { CircleHelp, Mail, MessageSquareHeart } from "lucide-react";
import Link from "next/link";

import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { buttonVariants } from "@/components/ui/button";
import { FeedbackForm } from "@/features/feedback/components/feedback-form";
import { getCurrentProfile } from "@/lib/auth/guards";
import { faqSchema, JsonLd, organizationSchema } from "@/lib/seo/json-ld";
import { cn } from "@/lib/utils";

export const metadata = {
  title: "Help",
  description: "Get help with SamaanX rentals, listings, and account.",
};

const HELP_FAQS = [
  {
    question: "How do I rent an item on SamaanX?",
    answer:
      "Browse or search listings, open a listing, pick dates, and send a rental request. Track status under My Rentals.",
  },
  {
    question: "How do I list an item for rent?",
    answer:
      "Switch to Seller mode, create a listing with photos and availability, then manage incoming requests under Requests.",
  },
  {
    question: "How does handover verification work?",
    answer:
      "When a rental is approved, both parties use QR and PIN codes to confirm handover and return safely.",
  },
] as const;

export default async function HelpPage() {
  const profile = await getCurrentProfile();

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-16 sm:px-6 sm:pt-6">
      <JsonLd
        data={[
          organizationSchema(),
          faqSchema(
            HELP_FAQS.map((f) => ({ question: f.question, answer: f.answer })),
          ),
        ]}
      />
      <header className="mb-6 space-y-2">
        <BackButton fallbackHref={BACK_FALLBACKS.help} />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Help
        </h1>
        <p className="text-muted-foreground text-sm">
          Quick answers while we build a full help center.
        </p>
      </header>

      <section className="border-brand-green/25 bg-brand-green/5 mb-6 rounded-2xl border p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <MessageSquareHeart className="text-brand-green size-5" aria-hidden />
          <h2 className="text-base font-semibold">Send us feedback</h2>
        </div>
        <p className="text-muted-foreground mb-4 text-sm">
          Spotted a bug or have an idea? We read every message.
        </p>
        {profile ? (
          <FeedbackForm showIntro={false} />
        ) : (
          <Link
            href="/login?next=/feedback"
            className={cn(buttonVariants({ size: "sm" }), "rounded-xl")}
          >
            Sign in to send feedback
          </Link>
        )}
      </section>

      <div className="space-y-3">
        <section className="border-border/80 bg-card rounded-2xl border p-4 shadow-[var(--rp-shadow-xs)]">
          <div className="text-brand-blue mb-2 flex items-center gap-2">
            <CircleHelp className="size-4" aria-hidden />
            <h2 className="text-foreground text-sm font-semibold">
              Renting an item
            </h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Browse, open a listing, pick dates, and send a request. Track status
            under My Rentals. When approved, use handover verification to start.
          </p>
        </section>

        <section className="border-border/80 bg-card rounded-2xl border p-4 shadow-[var(--rp-shadow-xs)]">
          <div className="text-brand-green mb-2 flex items-center gap-2">
            <CircleHelp className="size-4" aria-hidden />
            <h2 className="text-foreground text-sm font-semibold">
              Lending an item
            </h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Switch to Seller mode, create a listing, then manage requests under
            Requests. Approve to unlock handover codes for both parties.
          </p>
        </section>

        <section className="border-border/80 bg-card rounded-2xl border p-4 shadow-[var(--rp-shadow-xs)]">
          <div className="mb-2 flex items-center gap-2">
            <Mail className="text-muted-foreground size-4" aria-hidden />
            <h2 className="text-sm font-semibold">Contact</h2>
          </div>
          <p className="text-muted-foreground text-sm">
            Need more help? Reach us at{" "}
            <Link
              href="mailto:support@samaanx.com"
              className="text-brand-blue font-medium underline-offset-4 hover:underline"
            >
              support@samaanx.com
            </Link>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
