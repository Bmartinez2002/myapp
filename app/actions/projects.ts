"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function addProject(input: {
  name: string;
  client?: string;
  value_cop?: number;
  deadline?: string;
  stage?: string;
}) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const { error } = await sb.from("projects").insert({
    user_id:     user.id,
    name:        input.name.trim(),
    client:      input.client?.trim() || null,
    value_cents: input.value_cop ? input.value_cop * 100 : 0,
    deadline:    input.deadline || null,
    stage:       input.stage ?? "lead",
    progress:    0,
  });
  if (error) throw error;
  revalidatePath("/ceo");
}

export async function deleteProject(id: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  await sb.from("projects").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/ceo");
}

export async function updateProjectProgress(id: string, progress: number) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  await sb.from("projects").update({ progress }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/ceo");
}

const STAGES = ["lead", "discovery", "proposal", "active", "won", "paused", "lost"] as const;

export async function cycleProjectStage(projectId: string, currentStage: string) {
  const idx = STAGES.indexOf(currentStage as typeof STAGES[number]);
  const next = STAGES[(idx < 0 ? 0 : idx + 1) % STAGES.length];

  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  await sb.from("projects").update({ stage: next }).eq("id", projectId).eq("user_id", user.id);
  revalidatePath("/ceo");
}
