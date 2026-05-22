import { supabaseServer } from "@/lib/supabase/server";
import { localDay, addDays, startOfLocalDay } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { HabitsGrid, type HabitWithStreak } from "@/components/feature/HabitsGrid";
import Link from "next/link";

export const dynamic = "force-dynamic";

// Compute streak for a single habit from a set of hit dates
function computeStreak(hitDates: Set<string>, todayKey: string): number {
  let n = 0;
  // parse todayKey and step backwards day by day
  let [y, m, d] = todayKey.split("-").map(Number);
  let cursor = new Date(Date.UTC(y, m - 1, d, 12)); // noon UTC avoids DST edge cases

  for (let i = 0; i < 365; i++) {
    const k = cursor.toISOString().slice(0, 10);
    if (hitDates.has(k)) {
      n++;
    } else if (i === 0) {
      // today not done yet — skip without breaking streak (same logic as standalone)
    } else {
      break;
    }
    cursor = new Date(cursor.getTime() - 86_400_000);
  }
  return n;
}

export default async function HabitsPage() {
  const sb = await supabaseServer();
  const today = startOfLocalDay();
  const todayKey = localDay();

  const [{ data: habits }, { data: allHits }, { data: todayEvs }] = await Promise.all([
    sb.from("habits").select("id, name, emoji, anti_fuga").order("anti_fuga", { ascending: false }),
    sb.from("habit_hits")
      .select("habit_id, hit_date, done")
      .gte("hit_date", addDays(today, -60).toISOString().slice(0, 10))
      .eq("done", true),
    sb.from("money_events")
      .select("id")
      .gte("occurred_at", today.toISOString())
      .lt("occurred_at", addDays(today, 1).toISOString()),
  ]);

  const habitsArr = habits ?? [];
  const hitsArr   = allHits ?? [];

  // Build hit lookup: Set<"YYYY-MM-DD"> per habit
  const hitsByHabit = new Map<string, Set<string>>();
  for (const h of habitsArr) hitsByHabit.set(h.id, new Set());
  for (const hit of hitsArr) {
    hitsByHabit.get(hit.habit_id)?.add(hit.hit_date);
  }

  // Compute streaks
  const habitsWithStreak: HabitWithStreak[] = habitsArr.map(h => ({
    ...h,
    streak: computeStreak(hitsByHabit.get(h.id) ?? new Set(), todayKey),
  }));

  const mainHabit   = habitsWithStreak.find(h => h.anti_fuga) ?? habitsWithStreak[0];
  const otherHabits = habitsWithStreak.filter(h => h.id !== mainHabit?.id);

  // Today's marked habits
  const todayHitSet = new Set(
    hitsArr.filter(h => h.hit_date === todayKey).map(h => h.habit_id)
  );
  const hitIds = Array.from(todayHitSet);
  const todayCaptures = todayEvs?.length ?? 0;

  if (!mainHabit) {
    return (
      <div className="px-4 py-8 text-center text-fg-3">
        <div className="micro">SIN HÁBITOS</div>
        <p className="mt-2 text-sm">Agrega tu primer hábito para empezar.</p>
        <Link href="/settings/habits"
          className="inline-block mt-4 px-5 py-2.5 rounded-[10px] text-sm font-semibold"
          style={{background:"var(--color-accent)", color:"var(--color-bg-0)"}}>
          Gestionar hábitos →
        </Link>
      </div>
    );
  }

  const mainStreak = mainHabit.streak;
  const heroIcon   = mainStreak >= 18 ? "🔥" : mainStreak >= 7 ? "⚡" : mainStreak > 0 ? "✦" : "·";

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">
      <header className="flex items-end justify-between">
        <div>
          <div className="micro">STREAKS · DÍA</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">Disciplina</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/settings/habits"
            className="mono text-[11px] px-3 py-1.5 rounded-[8px] border"
            style={{color:"var(--color-fg-3)", borderColor:"var(--color-hair)"}}>
            Gestionar →
          </Link>
          <Pill kind="green">DÍA {mainStreak}</Pill>
        </div>
      </header>

      {/* ─ Hero racha ──────────────────────────────────────── */}
      <Card glow>
        <div className="relative overflow-hidden text-center py-2">
          <div className="absolute inset-0 pointer-events-none"
            style={{background:"radial-gradient(circle at 50% 30%, oklch(.85 .18 150 / .18), transparent 60%)"}}/>
          <div className="relative">
            <div className="text-[48px] mb-0.5 leading-none">{heroIcon}</div>
            <div className="micro">RACHA · {mainHabit.name.toUpperCase()}</div>
            <div className="mono font-light leading-none mt-1"
              style={{fontSize:78, letterSpacing:"-.04em",
                color: mainStreak > 0 ? "var(--color-accent)" : "var(--color-fg-3)"}}>
              {mainStreak}
            </div>
            <div className="mono text-[12px] text-fg-3 mt-1 tracking-[.08em]">
              {mainStreak === 1 ? "DÍA CONSECUTIVO" : "DÍAS CONSECUTIVOS"}
            </div>

            {/* 30-cell streak bar */}
            <div className="flex gap-[3px] mt-4 justify-center flex-wrap">
              {Array.from({length:30}).map((_,i) => (
                <span key={i} style={{
                  width:8, height:24, borderRadius:2, display:"inline-block",
                  background: i < mainStreak ? "var(--color-accent)" : "var(--color-bg-2)",
                  boxShadow: i === mainStreak - 1 ? "0 0 10px var(--color-accent)" : "none",
                }}/>
              ))}
            </div>
            {mainStreak < 30 && (
              <div className="mono text-[10.5px] text-fg-4 mt-2">
                {30 - mainStreak} días para el desafío 30
              </div>
            )}
            {mainStreak >= 30 && (
              <div className="mono text-[10.5px] mt-2" style={{color:"var(--color-accent)"}}>
                🏆 DESAFÍO 30 COMPLETADO
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ─ Interactive grid + toggle + rewards + summary ─── */}
      <HabitsGrid
        mainHabit={mainHabit}
        otherHabits={otherHabits}
        hitIds={hitIds}
        todayCaptures={todayCaptures}
      />
    </div>
  );
}
