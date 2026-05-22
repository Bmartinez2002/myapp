"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function toggleBlindaje() {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const { data: profile } = await sb
    .from("profiles")
    .select("prefs")
    .eq("id", user.id)
    .single();

  const current = (profile?.prefs as { blindaje?: boolean } | null) ?? {};
  const prefs = { ...current, blindaje: !current.blindaje };

  await sb.from("profiles").update({ prefs }).eq("id", user.id);
  revalidatePath("/anti-fuga");
}
