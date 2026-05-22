"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

function toSlug(name: string) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function addCategory({
  name, emoji, kind, risk_tier,
}: {
  name: string;
  emoji?: string;
  kind: "expense" | "income" | "transfer";
  risk_tier?: "safe" | "watch" | "danger";
}) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const slug = toSlug(name);
  const { error } = await sb.from("categories").insert({
    user_id: user.id, slug, name, emoji: emoji ?? null, kind, risk_tier: risk_tier ?? "safe",
  });
  if (error) throw new Error(error.message);
  revalidatePath("/settings/categories");
}

export async function updateCategory(
  id: string,
  patch: { name?: string; emoji?: string; risk_tier?: "safe" | "watch" | "danger" },
) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const update: Record<string, unknown> = {};
  if (patch.name      !== undefined) { update.name = patch.name; update.slug = toSlug(patch.name); }
  if (patch.emoji     !== undefined) update.emoji     = patch.emoji;
  if (patch.risk_tier !== undefined) update.risk_tier = patch.risk_tier;

  const { error } = await sb.from("categories").update(update).eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/categories");
}

export async function deleteCategory(id: string) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  const { error } = await sb.from("categories").delete().eq("id", id).eq("user_id", user.id);
  if (error) throw new Error(error.message);
  revalidatePath("/settings/categories");
}
