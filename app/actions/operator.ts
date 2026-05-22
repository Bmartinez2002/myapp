"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function saveBriefing({
  content,
  kind,
}: {
  content: string;
  kind: "daily" | "insight" | "weekly" | "simulation";
}) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  await sb.from("ai_briefings").insert({
    user_id:    user.id,
    kind,
    content_md: content,
  });

  revalidatePath("/operator");
}
