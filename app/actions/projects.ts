"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

const STAGES = ["lead", "discovery", "proposal", "active", "won"] as const;

export async function cycleProjectStage(projectId: string, currentStage: string) {
  const idx = STAGES.indexOf(currentStage as typeof STAGES[number]);
  const next = STAGES[(idx < 0 ? 0 : idx + 1) % STAGES.length];

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  await sb.from("projects").update({ stage: next }).eq("id", projectId).eq("user_id", user.id);
  revalidatePath("/ceo");
}
