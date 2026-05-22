import { z } from "zod";

export const CaptureKind = z.enum(["expense","income","transfer","debt_payment","block"]);
export const Need = z.enum(["necessary","impulse","protected","planned"]);

export const CaptureInput = z.object({
  amount_cents: z.number().int().nonnegative(),
  kind: CaptureKind.default("expense"),
  category_slug: z.string().min(1).optional(),
  merchant: z.string().max(120).optional(),
  account: z.string().max(60).optional(),
  need: Need.optional(),
  emotion_before: z.string().max(40).optional(),
  emotion_after_score: z.number().int().min(1).max(5).optional(),
  note: z.string().max(280).optional(),
  occurred_at: z.string().datetime().optional(),
  raw: z.string().max(500).optional(),
});
export type CaptureInput = z.infer<typeof CaptureInput>;

export const ParseRequest = z.object({
  text: z.string().min(1).max(280),
  locale: z.string().default("es-CO"),
});

export const SimulateRequest = z.object({
  scenario: z.enum(["skip_debt_payment","cut_subscription","raise_income","free"]),
  params: z.record(z.unknown()).default({}),
  question: z.string().optional(),
});
