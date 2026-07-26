import { cn } from "@/lib/utils";

type AuthHeaderProps = {
  title: string;
  description?: string;
  className?: string;
};

/** Clean form heading for the auth card (brand lives in the split panel / mobile header). */
export function AuthHeader({ title, description, className }: AuthHeaderProps) {
  return (
    <header className={cn("mb-7 space-y-2 text-center sm:mb-8", className)}>
      <h1 className="text-foreground text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
        {title}
      </h1>
      {description ? (
        <p className="text-muted-foreground text-sm leading-relaxed">
          {description}
        </p>
      ) : null}
    </header>
  );
}
