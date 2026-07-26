"use client";

import Script from "next/script";
import * as React from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;
const CLARITY_ID = process.env.NEXT_PUBLIC_CLARITY_ID;

/**
 * Lazy-loaded analytics — only mounts after idle to avoid blocking LCP.
 * No PII; events go through trackEvent() with sanitization.
 */
export function AnalyticsScripts() {
  const [enabled, setEnabled] = React.useState(false);

  React.useEffect(() => {
    if (!GA_ID && !CLARITY_ID) return;
    const idle =
      typeof requestIdleCallback === "function"
        ? requestIdleCallback
        : (cb: () => void) => window.setTimeout(cb, 1500);
    const cancel =
      typeof cancelIdleCallback === "function"
        ? cancelIdleCallback
        : clearTimeout;
    const id = idle(() => setEnabled(true));
    return () => cancel(id as number);
  }, []);

  if (!enabled) return null;

  return (
    <>
      {GA_ID ? (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            strategy="lazyOnload"
          />
          <Script id="ga4-init" strategy="lazyOnload">
            {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${GA_ID}',{send_page_view:true,anonymize_ip:true});`}
          </Script>
        </>
      ) : null}
      {CLARITY_ID ? (
        <Script id="clarity-init" strategy="lazyOnload">
          {`(function(c,l,a,r,i,t,y){c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);})(window,document,"clarity","script","${CLARITY_ID}");`}
        </Script>
      ) : null}
    </>
  );
}
