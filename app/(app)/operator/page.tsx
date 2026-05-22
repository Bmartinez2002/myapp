import { supabaseServer } from "@/lib/supabase/server";
import { localDay, addDays, startOfLocalDay } from "@/lib/dates";
import { Pill } from "@/components/ui/Pill";
import { OperatorChat, type OperatorCtx, type InitialMsg } from "@/components/feature/OperatorChat";

export const dynamic = "force-dynamic";

// Streak from Set<"YYYY-MM-DD"> of hit dates
function computeStreak(hitDates: Set<string>, todayKey: string): number {
  let n = 0;
  const [y, mo, d] = todayKey.split("-").map(Number);
  let cur = new Date(Date.UTC(y, mo - 1, d, 12));
  for (let i = 0; i < 30; i++) {
    const k = cur.toISOString().slice(0, 10);
    if (hitDates.has(k))      { n++; }
    else if (i === 0)         { /* today not done yet — don't break */ }
    else                      { break; }
    cur = new Date(cur.getTime() - 86_400_000);
  }
  return n;
}

export default async function OperatorPage() {
  const sb      = await supabaseServer();
  const today   = startOfLocalDay();
  const todayKey = localDay();

  const day14ago = addDays(today, -14);
  const day30ago = addDays(today, -30);

  const [
    { data: snap },
    { data: profile },
    { data: todayEvRaw },
    { data: ev30Raw },
    { data: habits },
    { data: hitsRaw },
    { data: debts },
    { data: totalEvRaw },
    { data: briefingsRaw },
  ] = await Promise.all([
    sb.from("daily_snapshots")
      .select("stability, pillar_capital, pillar_discipline, pillar_antifuga, meta_progress_cents")
      .order("on_date", { ascending: false })
      .limit(1)
      .maybeSingle(),
    sb.from("profiles")
      .select("daily_limit_cents, meta_target_cents")
      .single(),
    sb.from("money_events")
      .select("amount_cents, kind")
      .gte("occurred_at", today.toISOString())
      .eq("kind", "expense"),
    sb.from("money_events")
      .select("need")
      .gte("occurred_at", day30ago.toISOString())
      .eq("kind", "expense"),
    sb.from("habits").select("id, name"),
    sb.from("habit_hits")
      .select("habit_id, hit_date")
      .gte("hit_date", localDay(day14ago))
      .eq("done", true),
    sb.from("debts")
      .select("name, due_at, total_cents")
      .is("closed_at", null)
      .not("due_at", "is", null)
      .order("due_at", { ascending: true })
      .limit(1),
    sb.from("money_events").select("id", { count: "exact", head: true }),
    sb.from("ai_briefings")
      .select("id, kind, content_md, created_at")
      .order("created_at", { ascending: true })
      .limit(20),
  ]);

  // ── context ────────────────────────────────────────────────────
  const todaySpend = (todayEvRaw ?? []).reduce((s, e) => s + Number(e.amount_cents), 0);
  const impulses30 = (ev30Raw ?? []).filter(e => e.need === "impulse").length;

  // Habits with streak
  const hitsByHabit = new Map<string, Set<string>>();
  for (const h of habits ?? []) hitsByHabit.set(h.id, new Set());
  for (const hit of hitsRaw ?? []) {
    hitsByHabit.get(hit.habit_id)?.add(hit.hit_date);
  }
  const habitsWithStreak = (habits ?? []).map(h => ({
    name:   h.name,
    streak: computeStreak(hitsByHabit.get(h.id) ?? new Set(), todayKey),
  }));

  const nextDebt = debts?.[0] ?? null;

  const ctx: OperatorCtx = {
    stability:     snap?.stability     ?? 0,
    pillars: {
      capital:    snap?.pillar_capital    ?? 0,
      discipline: snap?.pillar_discipline ?? 0,
      antifuga:   snap?.pillar_antifuga   ?? 0,
    },
    todaySpendCop:  Math.round(todaySpend / 100),
    dailyLimitCop:  Math.round(Number(profile?.daily_limit_cents ?? 33000000) / 100),
    impulses30d:    impulses30,
    habits:         habitsWithStreak,
    savedSoFarCop:  Math.round(Number(snap?.meta_progress_cents ?? 0) / 100),
    metaTargetCop:  Math.round(Number(profile?.meta_target_cents ?? 2000000000) / 100),
    nextDebt: nextDebt ? {
      name:         nextDebt.name,
      due:          nextDebt.due_at,
      remainingCop: Math.round(Number(nextDebt.total_cents) / 100),
    } : null,
    totalEvents: (totalEvRaw as unknown as { count: number } | null)?.count ?? 0,
  };

  const initialMsgs: InitialMsg[] = (briefingsRaw ?? []).map(b => ({
    id:      b.id,
    kind:    "ai" as const,
    content: b.content_md,
    ts:      b.created_at,
  }));

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3 max-w-2xl mx-auto md:max-w-none">

      {/* ─ Header ─────────────────────────────────────────────── */}
      <header className="flex items-end justify-between">
        <div>
          <div className="micro">STABILITY ENGINE</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">AI Operator</h1>
        </div>
        <Pill kind="green">● LIVE</Pill>
      </header>

      {/* ─ Context chips ──────────────────────────────────────── */}
      <div className="flex flex-wrap gap-1.5">
        <Pill kind="plain">STABILITY {ctx.stability}/100</Pill>
        {habitsWithStreak.filter(h => h.streak > 0).slice(0, 2).map(h => (
          <Pill key={h.name} kind="blue">{h.name.split(" ")[0].toUpperCase()} {h.streak}D</Pill>
        ))}
        {nextDebt && <Pill kind="amber">VENCE {nextDebt.due ?? "pronto"}</Pill>}
      </div>

      {/* ─ Chat ───────────────────────────────────────────────── */}
      <OperatorChat initialMsgs={initialMsgs} ctx={ctx} />

    </div>
  );
}
