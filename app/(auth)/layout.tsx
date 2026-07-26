import { SamaanXLogo } from "@/components/brand/samaanx-logo";
import { APP_TAGLINE } from "@/config/constants";
import { AuthBrandPanel } from "@/features/auth/components/auth-brand-panel";
import { ThemeToggle } from "@/features/auth/components/theme-toggle";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="bg-background relative flex min-h-dvh">
      <AuthBrandPanel />

      <div className="relative flex min-h-dvh w-full flex-1 flex-col lg:w-[55%]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 overflow-hidden"
        >
          <div className="bg-brand-blue/10 dark:bg-brand-blue/20 absolute -top-28 right-0 h-64 w-64 rounded-full blur-3xl" />
          <div className="bg-brand-green/10 dark:bg-brand-green/15 absolute bottom-0 left-0 h-56 w-56 rounded-full blur-3xl" />
        </div>

        <header className="relative z-20 flex items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 sm:px-6 lg:justify-end lg:px-10">
          <SamaanXLogo
            priority
            className="lg:hidden [&_img]:h-7 sm:[&_img]:h-8"
          />
          <ThemeToggle />
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-6 sm:px-6 sm:py-10 lg:px-10 lg:py-12">
          <div className="w-full max-w-[440px]">{children}</div>
        </main>

        <footer className="text-muted-foreground relative z-10 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] text-center text-xs sm:px-6 lg:px-10">
          <p className="lg:hidden">{APP_TAGLINE}</p>
        </footer>
      </div>
    </div>
  );
}
