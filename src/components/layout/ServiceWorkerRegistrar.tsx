"use client";

import { useEffect } from "react";
import toast from "react-hot-toast";

const SYNC_TAG = "equistra-sync";

async function flush() {
  const { flushQueue } = await import("@/lib/offlineQueue");
  const { createClient } = await import("@/lib/supabase/client");
  const synced = await flushQueue(createClient());
  if (synced > 0) {
    toast.success(`${synced} action${synced > 1 ? "s" : ""} synchronisée${synced > 1 ? "s" : ""} 🔄`);
  }
}

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    // Register SW
    navigator.serviceWorker.register("/sw.js").catch(() => {});

    // Listen for SW → client flush messages (from background sync event)
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "FLUSH_OFFLINE_QUEUE") {
        flush();
      }
    };
    navigator.serviceWorker.addEventListener("message", handleMessage);

    // Also flush on manual online event (Safari, Firefox which lack Background Sync API)
    const handleOnline = async () => {
      // Try to register background sync first (Chrome/Android)
      try {
        const reg = await navigator.serviceWorker.ready;
        if ("sync" in reg) {
          await (reg as any).sync.register(SYNC_TAG);
          return; // SW will handle it via postMessage
        }
      } catch {}
      // Fallback: flush directly from the page
      flush();
    };

    window.addEventListener("online", handleOnline);

    // Flush immediately if we have pending items and we're online
    if (navigator.onLine) {
      import("@/lib/offlineQueue").then(({ count }) =>
        count().then((n) => { if (n > 0) flush(); })
      );
    }

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
      window.removeEventListener("online", handleOnline);
    };
  }, []);

  return null;
}
