import { notFound, redirect } from "next/navigation";

import { BackButton } from "@/components/navigation/back-button";
import { getVerificationStatusView } from "@/features/verification";
import { VerificationPanel } from "@/features/verification/components/verification-panel";
import { requireUser } from "@/lib/auth/guards";
import { AppError } from "@/lib/errors/app-error";

type ReturnPageProps = {
  params: Promise<{ id: string }>;
};

export const metadata = {
  title: "Return verification",
  description: "Verify QR or PIN to complete item return.",
};

export default async function ReturnVerificationPage({
  params,
}: ReturnPageProps) {
  const { id } = await params;

  try {
    const { profile } = await requireUser();
    const status = await getVerificationStatusView({
      rentalId: id,
      userId: profile.id,
      stage: "RETURN",
    });

    const fallbackHref =
      status.role === "buyer" ? "/rentals" : "/seller/rentals";

    return (
      <div className="mx-auto w-full max-w-lg px-4 pt-[max(1rem,env(safe-area-inset-top))] pb-16 sm:px-6">
        <header className="mb-6 space-y-2">
          <BackButton fallbackHref={fallbackHref} />
          <h1 className="text-2xl font-semibold tracking-tight">
            Return confirmation
          </h1>
          <p className="text-muted-foreground text-sm">
            {status.listingTitle} · both parties must confirm after QR/PIN
          </p>
        </header>

        <VerificationPanel initial={status} stage="RETURN" />
      </div>
    );
  } catch (error) {
    if (error instanceof AppError && error.code === "UNAUTHORIZED") {
      redirect(`/login?next=/rentals/${id}/return`);
    }
    if (error instanceof AppError && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
}
