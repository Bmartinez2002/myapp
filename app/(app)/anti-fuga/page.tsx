import { supabaseServer } from "@/lib/supabase/server";
import { localDay, addDays, startOfLocalDay } from "@/lib/dates";
import { fmtCOP } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/ui/Icon";
import { ShieldToggle } from "@/components/feature/ShieldToggle";

export const dynamic = "force-dynamic";

// Anti-fuga index: sum of penalty factors (0–100, higher = more fuga)
function computeFugaIdx(
  impulseShare: number,
  dangerShare: number,
  recentRelapseFactor: number,
  dailyLimitOvershoot: number,
): number {
  return Math.max(0, Math.min(100, Math.round(
    Math.min(impulseShare, 1) * 30 +
    Math.min(dangerShare, 1) * 30 +
    recentRelapseFactor * 20 +
    dailyLimitOvershoot * 20,
  )));
}

function FugaDial({ pct }: { pct: number }) {
  const r = 32;
  const c = 2 * Math.PI * r;
  const col = pct > 60 ? "var(--color-danger)" : pct > 35 ? "var(--color-warn)" : "var(--color-accent)";
  return (
    <svg width={84} height={84} viewBox="0 0 84 84" style={{ flexShrink: 0 }}>
      <circle cx="42" cy="42" r={r} stroke="var(--color-bg-2)" strokeWidth="7" fill="none" />
      <circle
        cx="42" cy="42" r={r} stroke={col} strokeWidth="7" fill="none"
        strokeDasharray={c} strokeDashoffset={c - (pct / 100) * c}
        strokeLinecap="round" transform="rotate(-90 42 42)"
        style={{ filter: `drop-shadow(0 0 4px ${col})` }}
      />
      <text x="42" y="46" fontSize="18" fontWeight="500" textAnchor="middle"
        fill="var(--color-fg)" fontFamily="var(--font-mono, monospace)">{pct}</text>
    </svg>
  );
}

function SmallSignal({ ok, txt }: { ok: boolean; txt: string }) {
  const col = ok ? "var(--color-accent)" : "var(--color-warn)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        background: col, boxShadow: `0 0 6px ${col}`, flexShrink: 0,
      }} />
      <span style={{ fontSize: 12.5, color: "var(--color-fg-2)" }}>{txt}</span>
    </div>
  );
}

export default async function AntifugaPage() {
  const sb = await supabaseServer();
  const today = startOfLocalDay();

  const day14ago = addDays(today, -14);
  const day30ago = addDays(today, -30);
  const day60ago = addDays(today, -60);

  const [{ data: profile }, { data: cats }, { data: eventsRaw }] = await Promise.all([
    sb.from("profiles").select("daily_limit_cents, prefs").single(),
    sb.from("categories").select("id, name, emoji, risk_tier").eq("kind", "expense"),
    sb.from("money_events")
      .select("occurred_at, amount_cents, category_id, need, kind")
      .gte("occurred_at", day60ago.toISOString())
      .eq("kind", "expense"),
  ]);

  const dailyLimit = Number((profile?.daily_limit_cents as number | null) ?? 33000000);
  const blindaje = ((profile?.prefs as { blindaje?: boolean } | null)?.blindaje) ?? false;
  const events = eventsRaw ?? [];
  const catsArr = cats ?? [];

  // ── expense periods ────────────────────────────────────────────
  const day30agoISO = day30ago.toISOString();
  const ev30    = events.filter(e => e.occurred_at >= day30agoISO);
  const ev31_60 = events.filter(e => e.occurred_at <  day30agoISO);

  const totalSpent30   = ev30.reduce((s, e) => s + Number(e.amount_cents), 0);
  const impulseSpent30 = ev30.filter(e => e.need === "impulse")
    .reduce((s, e) => s + Number(e.amount_cents), 0);
  const impulseShare   = totalSpent30 > 0 ? impulseSpent30 / totalSpent30 : 0;

  // ── danger category share ──────────────────────────────────────
  const dangerIds = new Set(catsArr.filter(c => c.risk_tier === "danger").map(c => c.id));
  const dangerSpent30 = ev30
    .filter(e => e.category_id && dangerIds.has(e.category_id))
    .reduce((s, e) => s + Number(e.amount_cents), 0);
  const dangerShare = totalSpent30 > 0 ? dangerSpent30 / totalSpent30 : 0;

  // ── days since last impulse ────────────────────────────────────
  const lastImpulse = [...events]
    .filter(e => e.need === "impulse")
    .sort((a, b) => b.occurred_at.localeCompare(a.occurred_at))[0];
  let daysSinceImpulse = 999;
  if (lastImpulse) {
    daysSinceImpulse = Math.floor(
      (today.getTime() - new Date(lastImpulse.occurred_at).getTime()) / 86_400_000,
    );
  }
  const recentRelapseFactor = daysSinceImpulse === 0 ? 1 : daysSinceImpulse < 7 ? 0.5 : 0;

  // ── daily limit overshoot last 14d ─────────────────────────────
  const day14agoISO = day14ago.toISOString();
  const ev14ByDay   = new Map<string, number>();
  for (const e of events) {
    if (e.occurred_at >= day14agoISO) {
      const d = localDay(e.occurred_at);
      ev14ByDay.set(d, (ev14ByDay.get(d) ?? 0) + Number(e.amount_cents));
    }
  }
  const overshootDays   = [...ev14ByDay.values()].filter(v => v > dailyLimit).length;
  const dailyLimitOvershoot = overshootDays / 14;

  // ── fugaIdx ────────────────────────────────────────────────────
  const fugaIdx = computeFugaIdx(impulseShare, dangerShare, recentRelapseFactor, dailyLimitOvershoot);

  // ── category breakdown ─────────────────────────────────────────
  const spent30ByCat  = new Map<string, number>();
  const spent60ByCat  = new Map<string, number>();
  const lastByCat     = new Map<string, string>(); // catId → latest occurred_at

  for (const e of ev30)    if (e.category_id) spent30ByCat.set(e.category_id, (spent30ByCat.get(e.category_id) ?? 0) + Number(e.amount_cents));
  for (const e of ev31_60) if (e.category_id) spent60ByCat.set(e.category_id, (spent60ByCat.get(e.category_id) ?? 0) + Number(e.amount_cents));
  for (const e of events)  if (e.category_id) {
    const prev = lastByCat.get(e.category_id);
    if (!prev || e.occurred_at > prev) lastByCat.set(e.category_id, e.occurred_at);
  }

  const tierOrder = { danger: 0, watch: 1, safe: 2 } as const;

  const catBreakdown = catsArr
    .map(c => {
      const spent    = spent30ByCat.get(c.id) ?? 0;
      const prev     = spent60ByCat.get(c.id) ?? 0;
      const delta    = prev > 0 ? Math.round(((spent - prev) / prev) * 100) : 0;
      const lastISO  = lastByCat.get(c.id);
      const daysSince = lastISO
        ? Math.floor((today.getTime() - new Date(lastISO).getTime()) / 86_400_000)
        : 999;
      return { cat: c, spent, delta, daysSince };
    })
    .filter(x => x.spent > 0 || x.cat.risk_tier !== "safe")
    .sort((a, b) => {
      const ta = tierOrder[(a.cat.risk_tier as keyof typeof tierOrder) ?? "safe"] ?? 2;
      const tb = tierOrder[(b.cat.risk_tier as keyof typeof tierOrder) ?? "safe"] ?? 2;
      return ta !== tb ? ta - tb : b.spent - a.spent;
    });

  // ── heatmap: 28 days ──────────────────────────────────────────
  const heatByDay = new Map<string, number>();
  for (const e of events) {
    const d = localDay(e.occurred_at);
    heatByDay.set(d, (heatByDay.get(d) ?? 0) + Number(e.amount_cents));
  }
  const heatCells = Array.from({ length: 28 }, (_, i) => {
    const d = localDay(addDays(today, -(27 - i)));
    return heatByDay.get(d) ?? 0;
  });

  // ── status ─────────────────────────────────────────────────────
  const fugaColor   = fugaIdx > 60 ? "var(--color-danger)" : fugaIdx > 35 ? "var(--color-warn)" : "var(--color-accent)";
  const statusLabel = fugaIdx > 60 ? "PELIGRO" : fugaIdx > 35 ? "VIGILANCIA" : "ESTABLE";
  const statusKind  = (fugaIdx > 60 ? "red" : fugaIdx > 35 ? "amber" : "green") as "red" | "amber" | "green";

  const topSignals = catBreakdown.slice(0, 2);

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">

      {/* ─ Header ───────────────────────────────────────────────── */}
      <header className="flex items-end justify-between">
        <div>
          <div className="micro">ANTI-FUGA · ÍNDICE</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">Fugas</h1>
        </div>
        <Pill kind={statusKind}>{statusLabel}</Pill>
      </header>

      {/* ─ Hero: FugaDial ───────────────────────────────────────── */}
      <Card glow>
        <div className="relative">
          <div className="absolute pointer-events-none"
            style={{ right: -50, top: -50, width: 220, height: 220, borderRadius: "50%",
              background: "radial-gradient(circle, oklch(.82 .16 80 / .18), transparent 70%)" }} />
          <div className="flex gap-3.5 relative">
            <FugaDial pct={fugaIdx} />
            <div className="flex-1 min-w-0">
              <div className="micro">ÍNDICE DE FUGA</div>
              <div className="mono mt-1.5 leading-none"
                style={{ fontSize: 36, fontWeight: 500, color: fugaColor }}>
                {fugaIdx}
                <span className="text-[14px]" style={{ color: "var(--color-fg-4)" }}>/100</span>
              </div>
              <div className="mono text-[11px] mt-2" style={{ color: "var(--color-fg-3)" }}>
                {fugaIdx > 60
                  ? "Zona roja. Cortar fugas ya."
                  : fugaIdx > 35
                  ? <span>Zona <b style={{ color: "var(--color-warn)" }}>amarilla</b>. Vigilar.</span>
                  : <span>Sistema <b style={{ color: "var(--color-accent)" }}>estable</b>. Mantén el ritmo.</span>
                }
              </div>
            </div>
          </div>
          <div className="flex flex-col gap-1.5 mt-3.5">
            <SmallSignal
              ok={daysSinceImpulse >= 7}
              txt={daysSinceImpulse >= 999
                ? "Sin impulsos registrados"
                : `${daysSinceImpulse} días sin impulsivos`}
            />
            {topSignals.map((x, i) => (
              <SmallSignal key={i}
                ok={x.delta <= 0}
                txt={`${x.cat.name} ${x.delta > 0 ? "↑" : "↓"} ${Math.abs(x.delta || 0)}% vs mes ant.`}
              />
            ))}
          </div>
        </div>
      </Card>

      {/* ─ Category breakdown ───────────────────────────────────── */}
      <section>
        <div className="flex justify-between items-center pt-1 pb-2.5 px-1">
          <span className="micro">CATEGORÍAS · PELIGROSAS PRIMERO</span>
        </div>
        <div className="flex flex-col gap-2">
          {catBreakdown.map(({ cat, spent, delta, daysSince }, i) => {
            const maxCents = 50_000_000; // $500K COP
            const barPct   = Math.min(100, spent > 0 ? (spent / maxCents) * 100 : 0);
            const col      = cat.risk_tier === "danger"
              ? "var(--color-danger)"
              : cat.risk_tier === "watch"
              ? "var(--color-warn)"
              : "var(--color-accent-2)";
            return (
              <div key={i} style={{
                background: "linear-gradient(180deg, oklch(0.19 .007 250) 0%, oklch(0.16 .006 250) 100%)",
                border: "1px solid var(--color-hair)", borderRadius: 14, padding: "12px 14px",
              }}>
                <div className="flex gap-3">
                  <div className="size-9 rounded-[10px] grid place-items-center text-[18px] shrink-0"
                    style={{ background: "var(--color-bg-2)", border: "1px solid var(--color-hair)" }}>
                    {cat.emoji ?? "·"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-baseline gap-2">
                      <span style={{ fontSize: 13.5, fontWeight: 500 }}>{cat.name}</span>
                      <span className="mono shrink-0"
                        style={{ fontSize: 13, fontWeight: 500, color: spent > 0 ? col : "var(--color-fg-4)" }}>
                        {fmtCOP(spent)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 mt-[3px]">
                      {delta !== 0 ? (
                        <span className="mono"
                          style={{ fontSize: 10, color: delta > 0 ? "var(--color-danger)" : "var(--color-accent)" }}>
                          {delta > 0 ? "↑ +" : "↓ "}{Math.abs(delta)}% vs mes ant.
                        </span>
                      ) : (
                        <span className="mono" style={{ fontSize: 10, color: "var(--color-fg-4)" }}>sin cambio</span>
                      )}
                      {daysSince < 999 && daysSince > 0 && (
                        <span className="mono ml-auto"
                          style={{ fontSize: 10, color: "var(--color-accent)" }}>
                          ● {daysSince}d sin recaída
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-2.5">
                  <div style={{ height: 4, borderRadius: 99, background: "var(--color-bg-2)", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: Math.max(2, barPct) + "%", background: col, borderRadius: 99 }} />
                  </div>
                </div>
              </div>
            );
          })}
          {catBreakdown.length === 0 && (
            <Card>
              <div className="micro text-center py-1">SIN DATOS AÚN</div>
              <p className="mt-2 text-sm text-center" style={{ color: "var(--color-fg-3)" }}>
                Empieza a registrar gastos para ver el desglose.
              </p>
            </Card>
          )}
        </div>
      </section>

      {/* ─ Heatmap 4 semanas ────────────────────────────────────── */}
      <section>
        <div className="flex justify-between items-center pt-1 pb-2.5 px-1">
          <span className="micro">CALOR · 4 SEMANAS</span>
          <span className="mono text-[10px]" style={{ color: "var(--color-fg-4)" }}>vs límite diario</span>
        </div>
        <Card>
          <div className="grid gap-[3px]" style={{ gridTemplateColumns: "repeat(7, 1fr)" }}>
            {heatCells.map((v, i) => {
              const ratio = v / dailyLimit;
              let bg = "var(--color-bg-2)";
              if (v > 0) {
                if (ratio > 1)    bg = "var(--color-danger)";
                else if (ratio > 0.66) bg = "oklch(.82 .16 80 / .85)";
                else if (ratio > 0.33) bg = "oklch(.85 .18 150 / .6)";
                else                   bg = "oklch(.85 .18 150 / .3)";
              }
              const isToday = i === 27;
              return (
                <div key={i} style={{
                  aspectRatio: "1", borderRadius: 4, background: bg,
                  outline: isToday ? "1.5px solid var(--color-accent)" : "none",
                  outlineOffset: isToday ? "1px" : undefined,
                }} />
              );
            })}
          </div>
          <div className="flex justify-between mt-2.5">
            <span className="mono text-[9.5px]" style={{ color: "var(--color-fg-4)" }}>4 sem. atrás</span>
            <div className="flex items-center gap-2">
              {[
                { bg: "oklch(.85 .18 150 / .3)",  label: "<33%" },
                { bg: "oklch(.85 .18 150 / .6)",  label: "<66%" },
                { bg: "oklch(.82 .16 80 / .85)",  label: "<100%" },
                { bg: "var(--color-danger)",       label: ">límite" },
              ].map(({ bg, label }) => (
                <div key={label} className="flex items-center gap-1">
                  <span style={{ width: 7, height: 7, borderRadius: 2, background: bg, display: "block" }} />
                  <span className="mono text-[9px]" style={{ color: "var(--color-fg-4)" }}>{label}</span>
                </div>
              ))}
            </div>
            <span className="mono text-[9.5px]" style={{ color: "var(--color-fg-4)" }}>hoy</span>
          </div>
        </Card>
      </section>

      {/* ─ Modo blindaje ────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-3">
          <div className="size-[38px] rounded-[11px] grid place-items-center shrink-0"
            style={{
              background: "oklch(.85 .18 150 / .15)",
              border: "1px solid oklch(.85 .18 150 / .3)",
              color: "var(--color-accent)",
            }}>
            <Icon name="shield" size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <div style={{ fontSize: 13.5, fontWeight: 600 }}>Modo blindaje</div>
            <div className="mono text-[11px] mt-0.5" style={{ color: "var(--color-fg-4)" }}>
              Recordatorio para evitar delivery 12–22h
            </div>
          </div>
          <ShieldToggle initial={blindaje} />
        </div>
      </Card>

    </div>
  );
}
