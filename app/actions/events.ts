"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function deleteMoneyEvent(id: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const { error } = await sb
    .from("money_events")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/today");
  revalidatePath("/");
  revalidatePath("/meta");
}

export async function updateMoneyEvent(id: string, patch: {
  amount_cents?: number;
  merchant?: string | null;
  note?: string | null;
  need?: string | null;
  category_id?: string | null;
}) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const update: Record<string, unknown> = {};
  if (patch.amount_cents !== undefined) update.amount_cents = patch.amount_cents;
  if ("merchant"  in patch) update.merchant   = patch.merchant;
  if ("note"      in patch) update.note        = patch.note;
  if ("need"      in patch) update.need        = patch.need;
  if ("category_id" in patch) update.category_id = patch.category_id;

  const { error } = await sb
    .from("money_events")
    .update(update)
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;

  revalidatePath("/today");
  revalidatePath("/");
}
