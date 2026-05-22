"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { CaptureInput } from "@/lib/schemas";
import { recomputeSnapshot } from "@/lib/snapshot";

export async function saveCapture(input: unknown) {
  const parsed = CaptureInput.parse(input);
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  let category_id: string | null = null;
  if (parsed.category_slug) {
    const { data: cat } = await sb.from("categories").select("id").eq("slug", parsed.category_slug).maybeSingle();
    category_id = cat?.id ?? null;
  }

  const occurredAt = parsed.occurred_at ?? new Date().toISOString();
  const { error } = await sb.from("money_events").insert({
    user_id: user.id,
    amount_cents: parsed.amount_cents,
    kind: parsed.kind,
    category_id,
    merchant: parsed.merchant,
    account: parsed.account,
    need: parsed.need,
    emotion_before: parsed.emotion_before,
    emotion_after_score: parsed.emotion_after_score,
    note: parsed.note,
    occurred_at: occurredAt,
    raw: parsed.raw,
  });
  if (error) throw new Error(error.message);

  // Auto-mark "Registrar gastos del día" habit on the first expense of the day
  if (parsed.kind === "expense") {
    const dayStart = occurredAt.slice(0, 10) + "T00:00:00.000Z";
    const dayEnd   = occurredAt.slice(0, 10) + "T23:59:59.999Z";
    const { count } = await sb
      .from("money_events")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("kind", "expense")
      .gte("occurred_at", dayStart)
      .lte("occurred_at", dayEnd);
    if (count === 1) {
      const { data: habit } = await sb
        .from("habits")
        .select("id")
        .eq("user_id", user.id)
        .ilike("name", "%Registrar gastos%")
        .maybeSingle();
      if (habit) {
        await sb.from("habit_hits").upsert(
          { habit_id: habit.id, user_id: user.id, hit_date: occurredAt.slice(0, 10), done: true },
          { onConflict: "habit_id,hit_date" }
        );
      }
    }
  }

  // Fire-and-forget: don't block the capture response
  recomputeSnapshot(sb, user.id).catch(() => {});
  revalidatePath("/");
  revalidatePath("/today");
  revalidatePath("/meta");

  return { ok: true };
}
