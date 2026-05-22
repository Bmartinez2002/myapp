import { stability, StabilityInput } from "@/lib/stability";
import { localDay, TZ } from "@/lib/dates";
import { toZonedTime, fromZonedTime } from "date-fns-tz";
import { startOfMonth, subDays } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function recomputeSnapshot(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sb: SupabaseClient<any>,
  userId: string,
): Promise<{ score: number; pillars: { capital: number; discipline: number; antifuga: number } }> {
  const now       = new Date();
  const nowLocal  = toZonedTime(now, TZ);
  const today     = localDay(now);

  const monthStartUTC   = fromZonedTime(startOfMonth(nowLocal), TZ).toISOString();
  const day14AgoDate    = subDays(new Date(today), 14).toISOString().slice(0, 10);
  const day7AgoUTC      = subDays(now, 7).toISOString();
  const day14AgoUTC     = subDays(now, 14).toISOString();
  const week4AgoDate    = subDays(new Date(today), 28).toISOString().slice(0, 10);

  const [
    profileRes,
    monthEventsRes,
    events14dRes,
    habitsRes,
    hits14dRes,
    categoriesRes,
    reviewsRes,
    prevSnapRes,
    debtsRes,
  ] = await Promise.all([
    sb.from("profiles").select("meta_target_cents, daily_limit_cents").eq("id", userId).maybeSingle(),
    sb.from("money_events").select("kind, amount_cents, need, category_id, occurred_at").eq("user_id", userId).gte("occurred_at", monthStartUTC),
    sb.from("money_events").select("kind, amount_cents, occurred_at").eq("user_id", userId).gte("occurred_at", day14AgoUTC),
    sb.from("habits").select("id, target_per_period").eq("user_id", userId),
    sb.from("habit_hits").select("habit_id, done, hit_date").eq("user_id", userId).gte("hit_date", day14AgoDate),
    sb.from("categories").select("id, risk_tier").eq("user_id", userId),
    sb.from("weekly_reviews").select("closed_at, week_start").eq("user_id", userId).gte("week_start", week4AgoDate).not("closed_at", "is", null),
    sb.from("daily_snapshots").select("stability").eq("user_id", userId).lt("on_date", today).order("on_date", { ascending: false }).limit(1).maybeSingle(),
    sb.from("debts").select("total_cents").eq("user_id", userId).is("closed_at", null),
  ]);

  const profile     = profileRes.data;
  const monthEvents = (monthEventsRes.data ?? []) as { kind: string; amount_cents: number; need: string | null; category_id: string | null; occurred_at: string }[];
  const events14d   = (events14dRes.data ?? []) as { kind: string; amount_cents: number; occurred_at: string }[];
  const habits      = (habitsRes.data ?? []) as { id: string }[];
  const hits14d     = (hits14dRes.data ?? []) as { done: boolean; hit_date: string }[];
  const categories  = (categoriesRes.data ?? []) as { id: string; risk_tier: string | null }[];
  const reviews     = (reviewsRes.data ?? []) as { closed_at: string }[];
  const debts       = (debtsRes.data ?? []) as { total_cents: number }[];

  // ── Capital ─────────────────────────────────────────────────────────────
  const income  = monthEvents.filter(e => e.kind === "income").reduce((s, e) => s + e.amount_cents, 0);
  const expense = monthEvents.filter(e => e.kind === "expense").reduce((s, e) => s + e.amount_cents, 0);
  const savingsRateMonth = income > 0 ? Math.max(0, (income - expense) / income) : 0;

  const metaTarget       = (profile?.meta_target_cents as number | null) ?? 2_000_000_000_00;
  const requiredMonthly  = metaTarget / 24;
  const monthlySavings   = Math.max(0, income - expense);
  const metaVelocityRatio = requiredMonthly > 0 ? monthlySavings / requiredMonthly : 0;

  const totalDebt    = debts.reduce((s, d) => s + d.total_cents, 0);
  const annualIncome = income * 12;
  const debtToIncome = annualIncome > 0 ? Math.min(1, totalDebt / annualIncome) : 0;

  const protectedCents      = monthEvents.filter(e => e.need === "protected").reduce((s, e) => s + e.amount_cents, 0);
  const monthlyExpense      = expense || 1;
  const emergencyBufferMonths = protectedCents / monthlyExpense;

  // ── Discipline ───────────────────────────────────────────────────────────
  const totalPossible = habits.length * 14;
  const actualHits    = hits14d.filter(h => h.done).length;
  const habitHitRate14d = totalPossible > 0 ? actualHits / totalPossible : 0;

  const last7EventDays = new Set(
    events14d.filter(e => e.occurred_at >= day7AgoUTC).map(e => localDay(e.occurred_at))
  );
  const captureRegularity = last7EventDays.size / 7;

  let streak = 0;
  for (let i = 0; i < 14; i++) {
    const d = subDays(new Date(today), i).toISOString().slice(0, 10);
    if (events14d.some(e => localDay(e.occurred_at) === d)) streak++;
    else break;
  }
  const streakDepthScore     = Math.min(1, streak / 7);
  const weeklyReviewCompleted = Math.min(1, reviews.length / 4);

  // ── Antifuga ─────────────────────────────────────────────────────────────
  const monthExpenseEvents = monthEvents.filter(e => e.kind === "expense");
  const impulseCount       = monthEvents.filter(e => e.need === "impulse").length;
  const impulseShareMonth  = monthExpenseEvents.length > 0 ? impulseCount / monthExpenseEvents.length : 0;

  const dangerIds     = new Set(categories.filter(c => c.risk_tier === "danger").map(c => c.id));
  const dangerSpend   = monthExpenseEvents.filter(e => e.category_id && dangerIds.has(e.category_id)).reduce((s, e) => s + e.amount_cents, 0);
  const dangerCategoryShare = expense > 0 ? dangerSpend / expense : 0;

  const lastImpulse = [...monthEvents]
    .filter(e => e.need === "impulse")
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  const daysSinceLast = lastImpulse
    ? Math.floor((now.getTime() - new Date(lastImpulse.occurred_at).getTime()) / 86_400_000)
    : 999;
  const recentRelapseFactor = daysSinceLast <= 7 ? 1 : daysSinceLast <= 14 ? 0.5 : 0;

  const dailyLimit = (profile?.daily_limit_cents as number | null) ?? 200_000_00;
  const byDay = new Map<string, number>();
  monthExpenseEvents.forEach(e => {
    const d = localDay(e.occurred_at);
    byDay.set(d, (byDay.get(d) ?? 0) + e.amount_cents);
  });
  const daysInMonthSoFar  = Math.max(1, nowLocal.getDate());
  const overDays          = [...byDay.values()].filter(v => v > dailyLimit).length;
  const dailyLimitOvershoot = overDays / daysInMonthSoFar;

  // ── Compute + upsert ─────────────────────────────────────────────────────
  const input: StabilityInput = {
    savingsRateMonth, metaVelocityRatio, debtToIncome, emergencyBufferMonths,
    habitHitRate14d, captureRegularity, streakDepthScore, weeklyReviewCompleted,
    impulseShareMonth, dangerCategoryShare, recentRelapseFactor, dailyLimitOvershoot,
    prevStability: (prevSnapRes.data?.stability as number | undefined) ?? undefined,
  };

  const { score, pillars } = stability(input);

  await sb.from("daily_snapshots").upsert({
    user_id:            userId,
    on_date:            today,
    stability:          score,
    pillar_capital:     pillars.capital,
    pillar_discipline:  pillars.discipline,
    pillar_antifuga:    pillars.antifuga,
    spend_cents:        expense,
    income_cents:       income,
    protected_cents:    protectedCents,
    impulse_count:      impulseCount,
    streak_clean_days:  streak,
    meta_progress_cents: Math.max(0, income - expense),
  }, { onConflict: "user_id,on_date" });

  return { score, pillars };
}
