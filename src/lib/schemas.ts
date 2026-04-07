import { z } from "zod";
import { NextResponse } from "next/server";

// ─── Utilitaire : parse + réponse 400 automatique ────────────────────────────

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (!result.success) {
    const message = result.error.issues.map((e) => e.message).join(", ");
    return {
      success: false,
      response: NextResponse.json({ error: message }, { status: 400 }),
    };
  }
  return { success: true, data: result.data };
}

// ─── Schémas ─────────────────────────────────────────────────────────────────

export const ShareCreateSchema = z.object({
  email: z
    .string("Email requis")
    .email("Email invalide")
    .toLowerCase(),
  role: z.enum(["gerant", "coach"] as const, "Rôle invalide (gerant ou coach)"),
  can_see_training: z.boolean().default(true),
  can_see_health: z.boolean().default(false),
  can_see_competitions: z.boolean().default(true),
  can_see_planning: z.boolean().default(true),
});
export type ShareCreate = z.infer<typeof ShareCreateSchema>;

export const ReactionSchema = z.object({
  item_type: z.string("item_type requis").min(1),
  item_id: z.string("item_id requis").min(1),
  reaction_type: z.enum(["like", "fire", "strong", "trophy"]).default("like"),
});
export type Reaction = z.infer<typeof ReactionSchema>;

export const CoachChatSchema = z.object({
  horseId: z.string("horseId requis").uuid("horseId invalide"),
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1),
      })
    )
    .min(1, "Au moins un message requis"),
});
export type CoachChat = z.infer<typeof CoachChatSchema>;

export const AiInsightsSchema = z.object({
  horseId: z.string("horseId requis").uuid("horseId invalide"),
});
export type AiInsights = z.infer<typeof AiInsightsSchema>;

export const VoiceTranscribeSchema = z.object({
  transcript: z.string("transcript requis").min(1),
  context: z.string().optional(),
});
export type VoiceTranscribe = z.infer<typeof VoiceTranscribeSchema>;
