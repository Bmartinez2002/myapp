"use server";
import { supabaseServer } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function signOut() {
  const sb = await supabaseServer();
  await sb.auth.signOut();
  redirect("/login");
}
