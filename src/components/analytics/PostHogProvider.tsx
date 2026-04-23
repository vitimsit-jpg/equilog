"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

// Lazy PostHog init — only if key is set (RGPD: EU server, IP anonymized)
export default function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === "undefined") return;

    // Différer le chargement de 3s pour ne pas bloquer le LCP
    const timer = setTimeout(() => {
      import("posthog-js").then(({ default: posthog }) => {
        if (!posthog.__loaded) {
          posthog.init(key, {
            api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://eu.i.posthog.com",
            person_profiles: "identified_only",
            capture_pageview: false, // manual below
            capture_pageleave: true,
            ip: false, // anonymize IP — RGPD
            persistence: "memory", // no cookie — RGPD compliant without banner
            autocapture: false,
          });
        }
      });
    }, 3000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    if (!key || typeof window === "undefined") return;
    import("posthog-js").then(({ default: posthog }) => {
      posthog.capture("$pageview", { $current_url: window.location.href });
    });
  }, [pathname]);

  return <>{children}</>;
}
