"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Report to Sentry en production uniquement (import dynamique)
    if (process.env.NODE_ENV === "production") {
      import("@sentry/nextjs").then((Sentry) => {
        Sentry.captureException(error);
      });
    } else {
      console.error("GlobalError:", error);
    }
  }, [error]);

  return (
    <html>
      <body className="flex min-h-screen items-center justify-center bg-beige">
        <div className="card max-w-md text-center">
          <h2 className="section-title mb-2">Une erreur est survenue</h2>
          <p className="text-sm text-gray-500 mb-4">
            L&apos;erreur a été signalée automatiquement.
          </p>
          <button className="btn-primary" onClick={reset}>
            Réessayer
          </button>
        </div>
      </body>
    </html>
  );
}
