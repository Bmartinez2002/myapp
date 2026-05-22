"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function updateProfile({
  full_name,
  daily_limit_cents,
  meta_target_cents,
}: {
  full_name?:         string;
  daily_limit_cents?: number;
  meta_target_cents?: number;
}) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const patch: Record<string, unknown> = {};
  if (full_name         !== undefined) patch.full_name         = full_name;
  if (daily_limit_cents !== undefined) patch.daily_limit_cents = daily_limit_cents;
  if (meta_target_cents !== undefined) patch.meta_target_cents = meta_target_cents;

  await sb.from("profiles").update(patch).eq("id", user.id);
  revalidatePath("/settings");
  revalidatePath("/");
  revalidatePath("/meta");
  revalidatePath("/today");
}
