import { CheckCircle2, Lock, XCircle } from "lucide-react";

type VerificationStateScreenProps = {
  variant: "success" | "failure" | "expired" | "locked";
  title: string;
  description: string;
};

export function VerificationStateScreen({
  variant,
  title,
  description,
}: VerificationStateScreenProps) {
  const Icon =
    variant === "success"
      ? CheckCircle2
      : variant === "locked"
        ? Lock
        : XCircle;

  const iconClass =
    variant === "success"
      ? "text-brand-green"
      : variant === "expired" || variant === "failure"
        ? "text-destructive"
        : "text-brand-blue";

  return (
    <div className="border-border bg-card flex flex-col items-center rounded-2xl border px-6 py-10 text-center shadow-[var(--rp-shadow-sm)]">
      <Icon className={`size-12 ${iconClass}`} aria-hidden />
      <h2 className="mt-4 text-lg font-semibold tracking-tight">{title}</h2>
      <p className="text-muted-foreground mt-1 max-w-sm text-sm">
        {description}
      </p>
    </div>
  );
}
