import { createClient } from "@/lib/supabase/client";

type EventCategory = "horse" | "training" | "health" | "competition" | "budget" | "auth" | "ai" | "navigation" | "profile" | "onboarding";

interface TrackOptions {
  event_name: string;
  event_category: EventCategory;
  properties?: Record<string, unknown>;
  page_path?: string;
}

/**
 * Fire-and-forget client-side event tracker.
 * Writes to Supabase event_logs + PostHog if key is set.
 * Silently fails — never throws.
 */
export function trackEvent(opts: TrackOptions): void {
  if (typeof window === "undefined") return;

  const pagePath = opts.page_path ?? window.location.pathname;
  const userAgent = navigator.userAgent;
  const referrer = document.referrer || null;
  const sessionId = getSessionId();

  // — PostHog (optional, RGPD-compliant)
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (posthogKey) {
    import("posthog-js").then(({ default: posthog }) => {
      posthog.capture(opts.event_name, {
        category: opts.event_category,
        page_path: pagePath,
        ...opts.properties,
      });
    }).catch(() => {/* silent */});
  }

  // — Supabase internal
  const supabase = createClient();
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    supabase.from("event_logs").insert({
      user_id: user.id,
      event_name: opts.event_name,
      event_category: opts.event_category,
      properties: opts.properties ?? {},
      page_path: pagePath,
      session_id: sessionId,
      user_agent: userAgent,
      referrer: referrer,
    }).then(() => {/* silent */});
  });
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("eq_sid");
  if (!sid) {
    sid = crypto.randomUUID().replace(/-/g, "");
    sessionStorage.setItem("eq_sid", sid);
  }
  return sid;
}
