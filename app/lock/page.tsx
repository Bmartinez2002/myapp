import { supabaseServer } from "@/lib/supabase/server";
import { localDay, addDays, startOfLocalDay } from "@/lib/dates";
import { LockScreen } from "./LockScreen";

export const dynamic = "force-dynamic";

export default async function LockPage() {
  const sb       = await supabaseServer();
  const today    = startOfLocalDay();
  const todayKey = localDay();
  const day14ago = localDay(addDays(today, -14));

  const [
    { data: snap },
    { data: antiHabit },
    { data: hitsRaw },
    { data: briefingRaw },
    { data: evCount },
    { data: dueDebts },
  ] = await Promise.all([
    sb.from("daily_snapshots")
      .select("stability")
      .order("on_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb.from("habits").select("id").eq("anti_fuga", true).limit(1).maybeSingle(),
    sb.from("habit_hits")
      .select("habit_id, hit_date")
      .gte("hit_date", day14ago)
      .eq("done", true),
    sb.from("ai_briefings")
      .select("content_md")
      .eq("kind", "daily")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb.from("money_events").select("id", { count: "exact", head: true }),
    sb.from("debts")
      .select("id")
      .is("closed_at", null)
      .not("due_at", "is", null),
  ]);

  // Compute anti-fuga streak
  let streak = 0;
  if (antiHabit) {
    const hitSet = new Set(
      (hitsRaw ?? []).filter(h => h.habit_id === antiHabit.id).map(h => h.hit_date),
    );
    const [y, mo, d] = todayKey.split("-").map(Number);
    let cur = new Date(Date.UTC(y, mo - 1, d, 12));
    for (let i = 0; i < 14; i++) {
      const k = cur.toISOString().slice(0, 10);
      if (hitSet.has(k))  { streak++; }
      else if (i === 0)   { /* today not done yet */ }
      else                { break; }
      cur = new Date(cur.getTime() - 86_400_000);
    }
  }

  return (
    <LockScreen
      stability={snap?.stability ?? 0}
      streak={streak}
      briefing={briefingRaw?.content_md ?? null}
      eventCount={(evCount as unknown as { count: number } | null)?.count ?? 0}
      dueCount={dueDebts?.length ?? 0}
    />
  );
}
