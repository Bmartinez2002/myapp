"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";
import { localDay } from "@/lib/dates";

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
