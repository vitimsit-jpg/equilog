"use client";

import * as Sentry from "@sentry/nextjs";

export default function SentryExamplePage() {
  return (
    <div style={{ padding: 40 }}>
      <h1>Sentry Test</h1>
      <button
        onClick={() => {
          throw new Error("Sentry test from example page");
        }}
      >
        Déclencher une erreur test
      </button>
      <button
        style={{ marginLeft: 16 }}
        onClick={async () => {
          await fetch("/api/sentry-test");
        }}
      >
        Déclencher une erreur serveur
      </button>
    </div>
  );
}
