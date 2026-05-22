"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { localDay } from "@/lib/dates";

export async function addHabit(input: { name: string; emoji?: string; anti_fuga?: boolean }) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const { error } = await sb.from("habits").insert({
    user_id:   user.id,
    name:      input.name.trim(),
    emoji:     input.emoji?.trim() || null,
    anti_fuga: input.anti_fuga ?? false,
  });
  if (error) throw error;
  revalidatePath("/habits");
  revalidatePath("/settings/habits");
}

export async function updateHabit(id: string, patch: { name?: string; emoji?: string; anti_fuga?: boolean }) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const update: Record<string, unknown> = {};
  if (patch.name      !== undefined) update.name      = patch.name.trim();
  if (patch.emoji     !== undefined) update.emoji     = patch.emoji?.trim() || null;
  if (patch.anti_fuga !== undefined) update.anti_fuga = patch.anti_fuga;

  const { error } = await sb.from("habits").update(update).eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/habits");
  revalidatePath("/settings/habits");
}

export async function deleteHabit(id: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const { error } = await sb.from("habits").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/habits");
  revalidatePath("/settings/habits");
}

export async function toggleHabit(habitId: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const today = localDay();

  const { data: existing } = await sb
    .from("habit_hits")
    .select("id, done")
    .eq("habit_id", habitId)
    .eq("hit_date", today)
    .maybeSingle();

  if (existing) {
    await sb.from("habit_hits").update({ done: !existing.done }).eq("id", existing.id);
  } else {
    await sb.from("habit_hits").insert({
      habit_id: habitId,
      user_id: user.id,
      hit_date: today,
      done: true,
    });
  }

  revalidatePath("/habits");
  revalidatePath("/");
}
