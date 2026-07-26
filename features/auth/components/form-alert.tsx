import { cn } from "@/lib/utils";

type FieldErrorProps = {
  message?: string;
  id?: string;
  className?: string;
};

export function FieldError({ message, id, className }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return (
    <p
      id={id}
      role="alert"
      className={cn("text-destructive text-sm", className)}
    >
      {message}
    </p>
  );
}

type FormAlertProps = {
  message?: string | null;
  tone?: "error" | "success";
};

export function FormAlert({ message, tone = "error" }: FormAlertProps) {
  if (!message) {
    return null;
  }

  return (
    <div
      role="alert"
      className={cn(
        "rounded-xl border px-3 py-2.5 text-sm",
        tone === "error"
          ? "border-destructive/30 bg-destructive/10 text-destructive"
          : "border-brand-green/30 bg-brand-green-soft text-foreground",
      )}
    >
      {message}
    </div>
  );
}
