"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function addDebt(input: {
  name: string;
  source?: string;
  total_cents: number;
  rate_annual?: number;
  due_at?: string;
}) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const { error } = await sb.from("debts").insert({
    user_id:     user.id,
    name:        input.name.trim(),
    source:      input.source?.trim() || null,
    total_cents: input.total_cents,
    rate_annual: input.rate_annual ?? 0,
    due_at:      input.due_at || null,
  });
  if (error) throw error;
  revalidatePath("/settings/debts");
  revalidatePath("/meta");
  revalidatePath("/operator");
}

export async function updateDebt(id: string, patch: {
  name?: string;
  source?: string;
  total_cents?: number;
  rate_annual?: number;
  due_at?: string | null;
}) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const update: Record<string, unknown> = {};
  if (patch.name        !== undefined) update.name        = patch.name.trim();
  if (patch.source      !== undefined) update.source      = patch.source?.trim() || null;
  if (patch.total_cents !== undefined) update.total_cents = patch.total_cents;
  if (patch.rate_annual !== undefined) update.rate_annual = patch.rate_annual;
  if ("due_at" in patch)              update.due_at       = patch.due_at || null;

  const { error } = await sb.from("debts").update(update).eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/settings/debts");
  revalidatePath("/meta");
  revalidatePath("/operator");
}

export async function closeDebt(id: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const { error } = await sb.from("debts")
    .update({ closed_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/settings/debts");
  revalidatePath("/meta");
  revalidatePath("/operator");
}

export async function reopenDebt(id: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const { error } = await sb.from("debts")
    .update({ closed_at: null })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/settings/debts");
  revalidatePath("/meta");
  revalidatePath("/operator");
}

export async function deleteDebt(id: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const { error } = await sb.from("debts").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw error;
  revalidatePath("/settings/debts");
  revalidatePath("/meta");
  revalidatePath("/operator");
}
