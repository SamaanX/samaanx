import Link from "next/link";

type AuthFooterProps = {
  prompt: string;
  linkHref: string;
  linkLabel: string;
};

export function AuthFooter({ prompt, linkHref, linkLabel }: AuthFooterProps) {
  return (
    <p className="text-muted-foreground mt-6 text-center text-sm">
      {prompt}{" "}
      <Link
        href={linkHref}
        className="text-brand-blue focus-visible:ring-ring font-semibold underline-offset-4 transition-colors hover:underline focus-visible:rounded-sm focus-visible:ring-2 focus-visible:outline-none"
      >
        {linkLabel}
      </Link>
    </p>
  );
}
