import { supabaseServer } from "@/lib/supabase/server";
import { localDay, addDays, startOfLocalDay, startOfLocalWeek } from "@/lib/dates";
import { fmtCOP } from "@/lib/money";
import { Pill } from "@/components/ui/Pill";
import { ReviewFlow, type PastReview, type ReviewStability } from "@/components/feature/ReviewFlow";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const sb = await supabaseServer();
  const today    = startOfLocalDay();
  const weekStart = startOfLocalWeek();

  const day7ago   = addDays(today, -6);
  const day30ago  = addDays(today, -30);
  const day7Key   = localDay(day7ago);
  const weekStartKey = localDay(weekStart);

  const [
    { data: snapshot },
    { data: weekEvRaw },
    { data: monthEvRaw },
    { data: habits },
    { data: weekHits },
    { data: pastRaw },
  ] = await Promise.all([
    sb.from("daily_snapshots")
      .select("stability, pillar_capital, pillar_discipline, pillar_antifuga")
      .order("on_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb.from("money_events")
      .select("kind, need, amount_cents")
      .gte("occurred_at", day7ago.toISOString()),
    sb.from("money_events")
      .select("id")
      .gte("occurred_at", day30ago.toISOString()),
    sb.from("habits").select("id, name"),
    sb.from("habit_hits")
      .select("habit_id, done")
      .gte("hit_date", day7Key)
      .eq("done", true),
    sb.from("weekly_reviews")
      .select("id, week_start, stability, word, reflection")
      .order("week_start", { ascending: false })
      .limit(3),
  ]);

  const weekEvs   = weekEvRaw   ?? [];
  const habitsArr = habits      ?? [];
  const hitsArr   = weekHits    ?? [];

  // ── stability ──────────────────────────────────────────────────
  const stability: ReviewStability = {
    score: snapshot?.stability    ?? 0,
    pillars: {
      capital:    snapshot?.pillar_capital    ?? 0,
      discipline: snapshot?.pillar_discipline ?? 0,
      antifuga:   snapshot?.pillar_antifuga   ?? 0,
    },
  };

  // ── auto-detect wins ───────────────────────────────────────────
  const expenses7d  = weekEvs.filter(e => e.kind === "expense");
  const impulses7d  = weekEvs.filter(e => e.need === "impulse");
  const nonImpulse  = expenses7d.filter(e => e.need !== "impulse").length;

  const hitsByHabit = new Map<string, number>();
  for (const h of hitsArr) {
    hitsByHabit.set(h.habit_id, (hitsByHabit.get(h.habit_id) ?? 0) + 1);
  }

  const income7d  = weekEvs.filter(e => e.kind === "income").reduce((s, e) => s + Number(e.amount_cents), 0);
  const expense7d = expenses7d.reduce((s, e) => s + Number(e.amount_cents), 0);
  const saved     = income7d - expense7d;

  const wins: string[] = [];
  if (impulses7d.length === 0 && nonImpulse > 0) {
    wins.push(`${nonImpulse} gastos esta semana, cero impulsivos`);
  }
  for (const h of habitsArr) {
    const hits = hitsByHabit.get(h.id) ?? 0;
    if (hits >= 5) wins.push(`${h.name} · ${hits} de 7 días`);
  }
  if (saved > 0) wins.push(`${fmtCOP(saved)} ahorrados esta semana`);

  // ── auto-detect misses ─────────────────────────────────────────
  const misses: string[] = [];
  if (impulses7d.length > 0) {
    const total = impulses7d.reduce((s, e) => s + Number(e.amount_cents), 0);
    misses.push(`${impulses7d.length} impulsos esta semana · ${fmtCOP(total)}`);
  }
  for (const h of habitsArr) {
    const hits = hitsByHabit.get(h.id) ?? 0;
    if (hits <= 2) misses.push(`${h.name} · solo ${hits} de 7 días`);
  }

  // ── protected this week (block events) ────────────────────────
  const protectedCents = weekEvs
    .filter(e => e.kind === "block")
    .reduce((s, e) => s + Number(e.amount_cents), 0);

  // ── past reviews (exclude current week) ───────────────────────
  const pastReviews: PastReview[] = (pastRaw ?? [])
    .filter(r => r.week_start !== weekStartKey)
    .slice(0, 3);

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">

      {/* ─ Header ───────────────────────────────────────────────── */}
      <header className="flex items-end justify-between">
        <div>
          <div className="micro">CIERRE DE SEMANA</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">Weekly Review</h1>
        </div>
        <Pill kind="plain">{weekStartKey}</Pill>
      </header>

      {/* ─ 6-step review flow ───────────────────────────────────── */}
      <ReviewFlow
        stability={stability}
        weekEventCount={weekEvs.length}
        monthEventCount={monthEvRaw?.length ?? 0}
        wins={wins.slice(0, 4)}
        misses={misses.slice(0, 3)}
        protectedCents={protectedCents}
        pastReviews={pastReviews}
        weekStart={weekStartKey}
      />

    </div>
  );
}
