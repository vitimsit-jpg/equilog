import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, NotificationType, Notification } from "@/lib/supabase/types";

interface CreateNotificationInput {
  type: NotificationType;
  title: string;
  body?: string;
  url?: string;
}

/**
 * Crée une notification en DB pour un user.
 * Doit être appelé avec un client Supabase (admin pour les crons, server pour les routes).
 * Logge en console + Sentry si la création échoue, mais ne throw jamais (best-effort).
 */
export async function createNotification(
  supabase: SupabaseClient<Database>,
  userId: string,
  input: CreateNotificationInput,
): Promise<void> {
  if (!userId) return;

  const { error } = await supabase.from("notifications").insert({
    user_id: userId,
    type: input.type,
    title: input.title,
    body: input.body ?? null,
    url: input.url ?? null,
    read: false,
  } as Partial<Notification>);

  if (error) {
    console.error("[notifications] insert failed", { userId, type: input.type, error: error.message });
  }
}
