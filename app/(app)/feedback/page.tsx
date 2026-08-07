import { redirect } from "next/navigation";

import { BackButton } from "@/components/navigation/back-button";
import { BACK_FALLBACKS } from "@/components/navigation/back-fallbacks";
import { getMyFeedbackAction } from "@/features/feedback/actions/feedback-actions";
import { FeedbackForm } from "@/features/feedback/components/feedback-form";
import { FEEDBACK_STATUS_LABELS } from "@/features/feedback/types/feedback";
import { getCurrentProfile } from "@/lib/auth/guards";

export const metadata = {
  title: "Feedback",
  description:
    "Send feedback to the SamaanX team — bugs, ideas, and suggestions.",
};

export default async function FeedbackPage() {
  const profile = await getCurrentProfile();
  if (!profile) {
    redirect("/login?next=/feedback");
  }

  const history = await getMyFeedbackAction();
  const recent = history.ok ? history.data : [];

  return (
    <div className="mx-auto w-full max-w-2xl px-4 pt-4 pb-20 sm:px-6 sm:pt-6">
      <header className="mb-6 space-y-2">
        <BackButton fallbackHref={BACK_FALLBACKS.profile} />
        <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
          Send feedback
        </h1>
        <p className="text-muted-foreground text-sm">
          Help us improve SamaanX. Your message goes directly to our team.
        </p>
      </header>

      <section className="border-border/70 bg-card mb-6 rounded-2xl border p-4 shadow-[var(--rp-shadow-xs)] sm:p-6">
        <FeedbackForm />
      </section>

      {recent.length > 0 ? (
        <section className="border-border/70 bg-card rounded-2xl border p-4 shadow-[var(--rp-shadow-xs)] sm:p-6">
          <h2 className="mb-3 text-sm font-semibold">
            Your recent submissions
          </h2>
          <ul className="space-y-2">
            {recent.map((item) => (
              <li
                key={item.id}
                className="border-border/60 bg-muted/30 rounded-xl border px-3 py-2.5"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium">{item.subject}</p>
                  <span className="text-muted-foreground text-xs">
                    {FEEDBACK_STATUS_LABELS[item.status] ?? item.status}
                  </span>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">
                  {item.category} ·{" "}
                  {new Date(item.createdAt).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
