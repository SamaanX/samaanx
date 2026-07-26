import "./globals.css";

import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";

import { SkipToContent } from "@/components/a11y/skip-to-content";
import { AnalyticsScripts } from "@/components/analytics/analytics-scripts";
import { SplashScreenLazy } from "@/components/brand/splash-screen-lazy";
import { PwaInstallPrompt } from "@/features/pwa/components/install-prompt";
import { ServiceWorkerRegister } from "@/features/pwa/components/sw-register";
import { defaultMetadata } from "@/lib/seo/metadata";
import { AppProviders } from "@/providers/app-providers";

const geistSans = Geist({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = defaultMetadata;

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F6FA" },
    { media: "(prefers-color-scheme: dark)", color: "#0F1729" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} min-h-dvh font-sans antialiased`}
      >
        <Script id="rentpe-theme-init" strategy="beforeInteractive">
          {`(function(){try{var k='rentpe-theme';var t=localStorage.getItem(k);var e=document.documentElement;if(t==='dark'||(t!=='light'&&(!t||t==='system')&&window.matchMedia('(prefers-color-scheme: dark)').matches)){e.classList.add('dark');e.style.colorScheme='dark'}else if(t==='light'){e.classList.remove('dark');e.style.colorScheme='light'}}catch(x){}})();`}
        </Script>
        <AppProviders>
          <SkipToContent />
          <ServiceWorkerRegister />
          <SplashScreenLazy />
          {children}
          <PwaInstallPrompt />
          <AnalyticsScripts />
        </AppProviders>
      </body>
    </html>
  );
}
