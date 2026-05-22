"use server";
import { revalidatePath } from "next/cache";
import { supabaseServer } from "@/lib/supabase/server";

export async function saveWeeklyReview({
  weekStart,
  reflection,
  word,
  commitments,
  stability,
}: {
  weekStart: string;
  reflection: string;
  word: string;
  commitments: string[];
  stability: number;
}) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) throw new Error("not authed");

  await sb.from("weekly_reviews").upsert(
    {
      user_id:     user.id,
      week_start:  weekStart,
      reflection:  reflection || null,
      word:        word || null,
      commitments: commitments.length ? commitments : null,
      stability,
      closed_at:   new Date().toISOString(),
    },
    { onConflict: "user_id,week_start" },
  );

  revalidatePath("/review");
}
