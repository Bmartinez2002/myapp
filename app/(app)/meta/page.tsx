import { supabaseServer } from "@/lib/supabase/server";
import { startOfLocalDay, addDays } from "@/lib/dates";
import { Card } from "@/components/ui/Card";
import { Bar } from "@/components/ui/Bar";
import { Pill } from "@/components/ui/Pill";
import { Ring } from "@/components/ui/Ring";
import { Icon } from "@/components/ui/Icon";
import { fmtCOP } from "@/lib/money";
import Link from "next/link";

export const dynamic = "force-dynamic";

type DebtRow = {
  id: string; name: string; total_cents: number; rate_annual: number; due_at: string | null;
  debt_payments: { amount_cents: number }[];
};

const LEVELS = [
  { lvl:1, name:"Iniciado",    t:100_000_000,   perks:"Sistema base · XP financiero" },
  { lvl:2, name:"Operador",    t:500_000_000,   perks:"Fondo emergencia 1 mes" },
  { lvl:3, name:"Estratega",   t:1_000_000_000, perks:"Primera inversión" },
  { lvl:4, name:"Constructor", t:2_000_000_000, perks:"Capital semilla · reserva 6m" },
];

const MONTHS = ["ENE","FEB","MAR","ABR","MAY","JUN","JUL","AGO","SEP","OCT","NOV","DIC"];

export default async function MetaPage() {
  const sb = await supabaseServer();
  const today = startOfLocalDay();

  const [{ data: profile }, { data: allEvents }, { data: debtRows }] = await Promise.all([
    sb.from("profiles").select("meta_target_cents").maybeSingle(),
    sb.from("money_events")
      .select("amount_cents, kind, occurred_at")
      .gte("occurred_at", addDays(today, -730).toISOString()),
    sb.from("debts")
      .select("id, name, total_cents, rate_annual, due_at, debt_payments(amount_cents)")
      .is("closed_at", null)
      .order("due_at", { ascending: true })
      .returns<DebtRow[]>(),
  ]);

  const target = Number(profile?.meta_target_cents ?? 200_000_000_000);
  const evs = allEvents ?? [];

  // ─ cumulative saved (all-time net: income − expense)
  const saved = evs.reduce((s, e) =>
    s + (e.kind === "income" ? Number(e.amount_cents) : e.kind === "expense" ? -Number(e.amount_cents) : 0), 0
  );
  const pct = Math.max(0, Math.min(100, (saved / target) * 100));

  // ─ monthly saving rate (last 30d)
  const now = new Date();
  const thirtyAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
  const month30 = evs.filter(e => new Date(e.occurred_at) >= thirtyAgo);
  const monthIncome = month30.filter(e => e.kind === "income").reduce((s,e)=>s+Number(e.amount_cents),0);
  const monthSpend  = month30.filter(e => e.kind === "expense").reduce((s,e)=>s+Number(e.amount_cents),0);
  const monthlySaving = Math.max(0, monthIncome - monthSpend);   // DB cents

  const monthsToGoal = monthlySaving > 0
    ? Math.ceil((target - saved) / monthlySaving)
    : null;

  const currentLevel = LEVELS.find(l => saved < l.t) ?? LEVELS[LEVELS.length - 1];

  // ─ trajectory points (COP = DB_cents / 100)
  type TPoint = { val: number; kind: "real" | "proj" };
  const tPoints: TPoint[] = [];
  for (let i = 5; i >= 0; i--) {
    const cutoff = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const cumEvs = evs.filter(e => new Date(e.occurred_at) < cutoff);
    const cum = cumEvs.reduce((s,e) =>
      s + (e.kind === "income" ? Number(e.amount_cents) : e.kind === "expense" ? -Number(e.amount_cents) : 0), 0
    );
    tPoints.push({ val: Math.max(0, cum / 100), kind: "real" });
  }
  let lastVal = tPoints[tPoints.length - 1].val;
  const monthlyRate = monthlySaving / 100;
  for (let i = 1; i <= 6; i++) {
    lastVal = Math.min(target / 100, lastVal + monthlyRate);
    tPoints.push({ val: lastVal, kind: "proj" });
  }
  const tLabels: string[] = [];
  for (let i = 5; i >= 0; i--) tLabels.push(MONTHS[(now.getMonth() - i + 12) % 12]);
  for (let i = 1; i <= 6; i++) tLabels.push(MONTHS[(now.getMonth() + i) % 12]);

  // ─ debts
  const debts = (debtRows ?? []).map(d => ({
    ...d,
    paid_cents: d.debt_payments.reduce((s, p) => s + Number(p.amount_cents), 0),
  }));
  const totalDebt = debts.reduce((s, d) => s + Math.max(0, Number(d.total_cents) - d.paid_cents), 0);

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">
      <header>
        <div className="micro">WEALTH TRAJECTORY</div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">Meta 20M</h1>
      </header>

      {/* ─ Hero ────────────────────────────────────────────────── */}
      <Card glow>
        <div className="relative overflow-hidden">
          <div className="absolute pointer-events-none"
            style={{right:-60, top:-60, width:240, height:240,
              background:"radial-gradient(circle, oklch(.85 .18 150 / .22), transparent 70%)", borderRadius:"50%"}}/>
          <div className="relative">
            <div className="micro">ACUMULACIÓN · LVL {currentLevel.lvl}</div>
            <div className="mono font-medium mt-2 leading-none tracking-tight" style={{fontSize:46, color:"var(--color-accent)"}}>
              {fmtCOP(Math.max(0, saved))}
            </div>
            <div className="mono text-[13px] text-fg-3 mt-1">/ {fmtCOP(target)} COP</div>
            <div className="mt-3.5">
              <Bar pct={pct} thick/>
              <div className="flex justify-between mt-2">
                <span className="mono text-[11px] text-accent">{pct.toFixed(1)}% completado</span>
                <span className="mono text-[11px] text-fg-3">{fmtCOP(Math.max(0, target - saved))} restante</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-1.5 mt-3.5">
              <Mini lbl="RITMO/M" v={fmtCOP(monthlySaving)}/>
              <Mini lbl="ETA"     v={monthsToGoal == null ? "—" : `${monthsToGoal}m`}/>
              <Mini lbl="MESES"   v={monthsToGoal == null ? "—" : String(monthsToGoal)}/>
            </div>
          </div>
        </div>
      </Card>

      {/* ─ Trajectory chart ────────────────────────────────────── */}
      <Card>
        <div className="flex justify-between items-start mb-2.5">
          <div>
            <div className="micro">TRAJECTORY · PROYECCIÓN</div>
            <div className="text-[14px] font-medium mt-1">Camino a los {fmtCOP(target)}</div>
          </div>
        </div>
        <TrajectoryChart points={tPoints} labels={tLabels} target={target}/>
      </Card>

      {/* ─ Niveles RPG ─────────────────────────────────────────── */}
      <section>
        <div className="flex justify-between items-center pt-1 pb-2.5 px-1">
          <span className="micro">NIVELES · RPG</span>
        </div>
        <div className="flex flex-col gap-2">
          {LEVELS.map(l => {
            const done    = saved >= l.t;
            const prevT   = LEVELS[l.lvl - 2]?.t ?? 0;
            const isCur   = !done && saved >= prevT;
            const localPct = isCur ? ((saved - prevT) / (l.t - prevT)) * 100 : (done ? 100 : 0);
            return (
              <div key={l.lvl} className="rounded-card border p-3 flex items-center gap-3"
                style={{
                  background: "oklch(0.18 .007 250)",
                  borderColor: isCur ? "oklch(.85 .18 150 / .4)" : "var(--color-hair)",
                  boxShadow: isCur ? "0 0 24px -8px oklch(.85 .18 150 / .4)" : "none",
                }}>
                <div className="size-10 rounded-full grid place-items-center font-semibold mono shrink-0"
                  style={{
                    background: done ? "var(--color-accent)" : "var(--color-bg-2)",
                    color: done ? "var(--color-bg-0)" : "var(--color-fg-3)",
                    border: "1px solid " + (done || isCur ? "var(--color-accent)" : "var(--color-hair)"),
                  }}>
                  {done ? <Icon name="check" size={16} stroke={2.4} className="text-bg-0"/> : l.lvl}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[13.5px] font-semibold">{l.name}</span>
                    <span className="mono text-[11px]"
                      style={{color: done ? "var(--color-accent)" : isCur ? "var(--color-fg)" : "var(--color-fg-4)"}}>
                      {fmtCOP(l.t)}
                    </span>
                  </div>
                  <div className="mono text-[10.5px] text-fg-4 mt-0.5">{l.perks}</div>
                  {isCur && (
                    <div className="mt-1.5"><Bar pct={localPct} style={{height:4}}/></div>
                  )}
                </div>
                {done
                  ? <Pill kind="green">DONE</Pill>
                  : isCur ? <Pill kind="green">EN CURSO</Pill>
                  : <Pill>LOCKED</Pill>
                }
              </div>
            );
          })}
        </div>
      </section>

      {/* ─ Deuda activa ────────────────────────────────────────── */}
      {debts.length === 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="micro">DEUDA ACTIVA</span>
            <Link href="/settings/debts"
              className="mono text-[11px] px-2.5 py-1 rounded-[7px] border"
              style={{color:"var(--color-fg-3)", borderColor:"var(--color-hair)"}}>
              Gestionar →
            </Link>
          </div>
          <div className="mono text-[13px] text-fg-3 mt-2">Sin deudas activas 🎉</div>
        </Card>
      )}
      {debts.length > 0 && (
        <Card>
          <div className="flex items-center justify-between">
            <span className="micro">DEUDA ACTIVA</span>
            <div className="flex items-center gap-2">
              <Link href="/settings/debts"
                className="mono text-[11px] px-2.5 py-1 rounded-[7px] border"
                style={{color:"var(--color-fg-3)", borderColor:"var(--color-hair)"}}>
                Gestionar →
              </Link>
              <Pill kind="amber">{debts.length} FUENTES</Pill>
            </div>
          </div>
          <div className="mono font-medium mt-1.5" style={{fontSize:24, color:"var(--color-warn)"}}>
            {fmtCOP(totalDebt)}
          </div>
          <div className="flex flex-col mt-2.5">
            {debts.map((d, i) => {
              const remaining = Math.max(0, Number(d.total_cents) - d.paid_cents);
              const days = d.due_at
                ? Math.floor((new Date(d.due_at).getTime() - Date.now()) / 86400000)
                : null;
              return (
                <div key={d.id} className="flex justify-between items-center py-2.5"
                  style={{borderTop: i ? "1px solid var(--color-hair)" : "none"}}>
                  <div>
                    <div className="text-[13px] font-medium">{d.name}</div>
                    <div className="mono text-[10.5px] text-fg-4 mt-0.5 flex items-center gap-1.5">
                      {d.due_at
                        ? <span className={days != null && days < 7 ? "text-warn" : ""}>
                            Vence en {days != null && days >= 0 ? `${days}d` : "vencido"}
                          </span>
                        : <span>Sin vencimiento</span>
                      }
                      {d.rate_annual > 0 && <><span>·</span><span>{Number(d.rate_annual).toFixed(1)}% EA</span></>}
                    </div>
                  </div>
                  <div className="mono text-[13px]">{fmtCOP(remaining)}</div>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

// ─ Mini metric chip ────────────────────────────────────────────
function Mini({ lbl, v }: { lbl: string; v: string }) {
  return (
    <div className="rounded-[10px] p-2 border"
      style={{background:"oklch(0.16 .006 250 / .6)", borderColor:"var(--color-hair)"}}>
      <div className="micro" style={{fontSize:9}}>{lbl}</div>
      <div className="mono text-[13px] font-medium mt-0.5">{v}</div>
    </div>
  );
}

// ─ Trajectory SVG ─────────────────────────────────────────────
function TrajectoryChart({
  points,
  labels,
  target,
}: {
  points: { val: number; kind: "real" | "proj" }[];
  labels: string[];
  target: number;
}) {
  const W = 320, H = 130, pad = 14;
  const maxVal = Math.max(target / 100, ...points.map(p => p.val), 1);
  const xs = (i: number) => pad + (i / (points.length - 1)) * (W - pad * 2);
  const ys = (v: number) => H - pad - (v / maxVal) * (H - pad * 2);

  const realPts = points.slice(0, 6).map((p, i) => `${xs(i)},${ys(p.val)}`).join(" ");
  const projPts = points.slice(5).map((p, i) => `${xs(i + 5)},${ys(p.val)}`).join(" ");

  const gridLines = [0.25, 0.5, 0.75, 1];

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H + 14}`} preserveAspectRatio="none"
        style={{width:"100%", height:H + 14, display:"block"}}>
        <defs>
          <linearGradient id="tjg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity=".35"/>
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {gridLines.map((p, i) => {
          const v = maxVal * p;
          return (
            <g key={i}>
              <line x1={pad} x2={W - pad} y1={ys(v)} y2={ys(v)}
                stroke="oklch(0.28 .008 250 / .7)" strokeDasharray="2 4"/>
              <text x={W - pad - 2} y={ys(v) - 2}
                fontFamily="var(--font-mono)" fontSize="8.5"
                fill="var(--color-fg-4)" textAnchor="end">
                ${(v / 1_000_000).toFixed(0)}M
              </text>
            </g>
          );
        })}

        {/* Projection line (dashed) */}
        {projPts && (
          <polyline points={projPts} fill="none"
            stroke="var(--color-accent-2)" strokeWidth="1.6"
            strokeDasharray="3 4" strokeLinecap="round"/>
        )}

        {/* Real area + line */}
        {points.slice(0, 6).length > 1 && (
          <>
            <polygon
              points={`${xs(0)},${H - pad} ${realPts} ${xs(5)},${H - pad}`}
              fill="url(#tjg)"/>
            <polyline points={realPts} fill="none"
              stroke="var(--color-accent)" strokeWidth="2.2"
              strokeLinecap="round" strokeLinejoin="round"/>
            {/* Current point dot with pulse ring */}
            <circle cx={xs(5)} cy={ys(points[5].val)} r="5"
              fill="var(--color-accent)"
              style={{filter:"drop-shadow(0 0 6px var(--color-accent))"}}/>
            <circle cx={xs(5)} cy={ys(points[5].val)} r="9"
              fill="none" stroke="var(--color-accent)" strokeWidth="1" opacity=".4"/>
          </>
        )}

        {/* Projection end dot */}
        <circle cx={xs(points.length - 1)} cy={ys(points[points.length - 1].val)}
          r="4" fill="var(--color-accent-2)"/>

        {/* X-axis labels (every other month) */}
        {labels.map((m, i) =>
          i % 2 === 0 ? (
            <text key={i} x={xs(i)} y={H + 6}
              fontFamily="var(--font-mono)" fontSize="8"
              fill="var(--color-fg-4)" textAnchor="middle">
              {m}
            </text>
          ) : null
        )}
      </svg>

      {/* Legend */}
      <div className="flex items-center gap-3.5 mt-2">
        <span className="flex items-center gap-1.5 mono text-[10.5px] text-fg-3">
          <span className="inline-block" style={{width:14, height:2, background:"var(--color-accent)"}}/>
          Real
        </span>
        <span className="flex items-center gap-1.5 mono text-[10.5px] text-fg-3">
          <span className="inline-block border-t border-dashed" style={{width:14, borderColor:"var(--color-accent-2)"}}/>
          Proyección
        </span>
      </div>
    </div>
  );
}
