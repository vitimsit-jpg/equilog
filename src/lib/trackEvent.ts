import { createClient } from "@/lib/supabase/client";

type EventCategory = "horse" | "training" | "health" | "competition" | "budget" | "auth" | "ai";

interface TrackOptions {
  event_name: string;
  event_category: EventCategory;
  properties?: Record<string, unknown>;
  page_path?: string;
}

/**
 * Fire-and-forget client-side event tracker.
 * Silently fails — never throws.
 */
export function trackEvent(opts: TrackOptions): void {
  const supabase = createClient();
  supabase.auth.getUser().then(({ data: { user } }) => {
    if (!user) return;
    supabase.from("event_logs").insert({
      user_id: user.id,
      event_name: opts.event_name,
      event_category: opts.event_category,
      properties: opts.properties ?? {},
      page_path: opts.page_path ?? (typeof window !== "undefined" ? window.location.pathname : null),
      session_id: getSessionId(),
    }).then(() => {/* silent */});
  });
}

function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let sid = sessionStorage.getItem("eq_sid");
  if (!sid) {
    sid = Math.random().toString(36).slice(2);
    sessionStorage.setItem("eq_sid", sid);
  }
  return sid;
}
