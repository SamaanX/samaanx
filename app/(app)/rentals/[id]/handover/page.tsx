import { notFound, redirect } from "next/navigation";

import { BackButton } from "@/components/navigation/back-button";
import { getVerificationStatusView } from "@/features/verification";
import { VerificationPanel } from "@/features/verification/components/verification-panel";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";

type HandoverPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Handover verification",
  description: "Verify QR or PIN to complete item handover.",
};

export default async function HandoverVerificationPage({
  params,
}: HandoverPageProps) {
  const { id } = await params;

  try {
    const { profile } = await requireUser();
    const status = await getVerificationStatusView({
      rentalId: id,
      userId: profile.id,
      stage: "HANDOVER",
    });

    const fallbackHref =
      status.role === "buyer" ? "/rentals" : "/seller/rentals";

    return (
      <div className="mx-auto w-full max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16 sm:px-6">
        <header className="mb-6 space-y-2">
          <BackButton fallbackHref={fallbackHref} />
          <h1 className="text-2xl font-semibold tracking-tight">Handover</h1>
          <p className="text-muted-foreground text-sm">
            {status.listingTitle} · verify possession transfer
          </p>
        </header>

        <VerificationPanel initial={status} stage="HANDOVER" />
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect(`/login?next=/rentals/${id}/handover`);
    }
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
}
