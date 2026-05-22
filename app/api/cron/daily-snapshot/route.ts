import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { localDay, addDays, startOfLocalDay } from "@/lib/dates";
import { stability } from "@/lib/stability";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  if (req.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const sb = supabaseAdmin();
  const { data: users } = await sb.from("profiles").select("id, daily_limit_cents, meta_target_cents");

  const today     = startOfLocalDay();
  const tomorrow  = addDays(today, 1);
  const todayKey  = localDay();

  for (const u of users ?? []) {
    // ── events: 30d window ──────────────────────────────────────
    const { data: ev30 } = await sb
      .from("money_events")
      .select("amount_cents, kind, need, occurred_at, categories(risk_tier)")
      .eq("user_id", u.id)
      .gte("occurred_at", addDays(today, -30).toISOString());

    const ev30safe = ev30 ?? [];
    const today_ev = ev30safe.filter(
      e => e.occurred_at >= today.toISOString() && e.occurred_at < tomorrow.toISOString()
    );
    const week_ev = ev30safe.filter(e => e.occurred_at >= addDays(today, -7).toISOString());

    const spend      = today_ev.filter(e => e.kind === "expense").reduce((s,e)=>s+Number(e.amount_cents),0);
    const income_day = today_ev.filter(e => e.kind === "income").reduce((s,e)=>s+Number(e.amount_cents),0);
    const protectedC = today_ev.filter(e => e.kind === "block").reduce((s,e)=>s+Number(e.amount_cents),0);
    const monthIncome= ev30safe.filter(e => e.kind === "income").reduce((s,e)=>s+Number(e.amount_cents),0);
    const monthSpend = ev30safe.filter(e => e.kind === "expense").reduce((s,e)=>s+Number(e.amount_cents),0);
    const impulses   = ev30safe.filter(e => e.need === "impulse").length;
    const dangerSpend= ev30safe
      .filter((e:any) => e.kind === "expense" && e.categories?.risk_tier === "danger")
      .reduce((s,e)=>s+Number(e.amount_cents),0);

    // ── habit hit rate (last 14 days) ────────────────────────────
    const habit14Start = addDays(today, -14).toISOString().slice(0,10);
    const [{ data: habits }, { data: hitRows }] = await Promise.all([
      sb.from("habits").select("id").eq("user_id", u.id),
      sb.from("habit_hits")
        .select("hit_date")
        .eq("user_id", u.id)
        .gte("hit_date", habit14Start)
        .eq("done", true),
    ]);
    const habitCount  = habits?.length ?? 0;
    const slots14     = habitCount * 14;
    const hits14      = hitRows?.length ?? 0;
    const habitHitRate14d = slots14 > 0 ? hits14 / slots14 : 0;

    // streak depth: log-normalized total hits across all habits last 14d
    const streakDepthScore = Math.min(1, Math.log10(1 + hits14) / 1.7);

    // capture regularity: days with at least 1 event last 7d
    const uniqueDays = new Set(week_ev.map(e => e.occurred_at.slice(0,10))).size;
    const captureRegularity = uniqueDays / 7;

    // ── weekly review completion (last 4 weeks) ──────────────────
    const fourWeeksAgo = addDays(today, -28).toISOString().slice(0,10);
    const { data: reviews } = await sb
      .from("weekly_reviews")
      .select("closed_at")
      .eq("user_id", u.id)
      .gte("week_start", fourWeeksAgo)
      .not("closed_at", "is", null);
    const weeklyReviewCompleted = Math.min(1, ((reviews?.length ?? 0) / 4));

    // ── debt-to-income ratio ─────────────────────────────────────
    const { data: debts } = await sb
      .from("debts")
      .select("total_cents")
      .eq("user_id", u.id)
      .is("closed_at", null);
    const totalDebt   = (debts ?? []).reduce((s,d)=>s+Number(d.total_cents), 0);
    const annualIncome= monthIncome * 12;
    const debtToIncome= annualIncome > 0 ? Math.min(1, totalDebt / annualIncome) : 0.5;

    // ── days over limit (last 14) ─────────────────────────────────
    const dailyLimit = Number(u.daily_limit_cents ?? 3300000);
    let overDays = 0;
    for (let i = 0; i < 14; i++) {
      const d = addDays(today, -i).toISOString().slice(0,10);
      const sp = ev30safe
        .filter(e => e.kind === "expense" && e.occurred_at.slice(0,10) === d)
        .reduce((s,e)=>s+Number(e.amount_cents),0);
      if (sp > dailyLimit) overDays++;
    }

    // ── recent relapse factor ────────────────────────────────────
    const lastImpulse = ev30safe
      .filter(e => e.need === "impulse")
      .sort((a,b) => b.occurred_at.localeCompare(a.occurred_at))[0];
    const daysSinceLast = lastImpulse
      ? Math.floor((today.getTime() - new Date(lastImpulse.occurred_at).getTime()) / 86400000)
      : 999;
    const recentRelapseFactor = daysSinceLast < 30 ? Math.max(0, 1 - daysSinceLast / 30) : 0;

    // ── fetch prev stability for EMA ────────────────────────────
    const { data: prevSnap } = await sb
      .from("daily_snapshots")
      .select("stability")
      .eq("user_id", u.id)
      .lt("on_date", todayKey)
      .order("on_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    // ── compute ─────────────────────────────────────────────────
    const score = stability({
      savingsRateMonth:      monthIncome > 0 ? Math.max(0, (monthIncome - monthSpend) / monthIncome) : 0,
      metaVelocityRatio:     monthIncome > monthSpend
        ? Math.min(1, (monthIncome - monthSpend) / (Number(u.meta_target_cents) / 24))
        : 0,
      debtToIncome,
      emergencyBufferMonths: 1,   // placeholder until savings-account tracking
      habitHitRate14d,
      captureRegularity,
      streakDepthScore,
      weeklyReviewCompleted,
      impulseShareMonth:     ev30safe.length > 0 ? impulses / ev30safe.length : 0,
      dangerCategoryShare:   monthSpend > 0 ? dangerSpend / monthSpend : 0,
      recentRelapseFactor,
      dailyLimitOvershoot:   overDays / 14,
      prevStability:         prevSnap?.stability ?? undefined,
    });

    // ── streak_clean_days: days since last impulse (capped 99) ──
    const streakClean = Math.min(99, daysSinceLast === 999 ? 0 : daysSinceLast);

    await sb.from("daily_snapshots").upsert({
      user_id:            u.id,
      on_date:            todayKey,
      stability:          score.score,
      pillar_capital:     score.pillars.capital,
      pillar_discipline:  score.pillars.discipline,
      pillar_antifuga:    score.pillars.antifuga,
      spend_cents:        spend,
      income_cents:       income_day,
      protected_cents:    protectedC,
      impulse_count:      today_ev.filter(e => e.need === "impulse").length,
      streak_clean_days:  streakClean,
      meta_progress_cents: monthIncome - monthSpend,
    }, { onConflict: "user_id,on_date" });
  }

  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
