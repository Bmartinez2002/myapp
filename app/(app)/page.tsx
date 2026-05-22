import { supabaseServer } from "@/lib/supabase/server";
import { startOfLocalDay, localDay, addDays, fmtTime, TZ } from "@/lib/dates";
import { fmtCOP } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Ring } from "@/components/ui/Ring";
import { Bar } from "@/components/ui/Bar";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Ev = {
  id: string; occurred_at: string; kind: string; amount_cents: number;
  merchant: string | null; need: string | null;
  categories: { name: string; emoji: string | null } | null;
};
type Debt = { id: string; name: string; total_cents: number; due_at: string | null };
type Habit = { id: string; name: string; emoji: string | null; anti_fuga: boolean };
type HabitHit = { habit_id: string; hit_date: string };
type IncomeEv = { id: string; occurred_at: string; amount_cents: number; merchant: string | null };

export default async function HomePage() {
  const sb = await supabaseServer();
  const today = startOfLocalDay();
  const todayKey = localDay();
  const yearAgo = addDays(today, -365).toISOString();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

  const [
    { data: profile },
    { data: snap },
    { data: ev7 },
    { data: allEvents },
    { data: habits },
    { data: hits },
    { data: debts },
    { data: todayEvRaw },
    { data: incomeEvRaw },
  ] = await Promise.all([
    sb.from("profiles").select("full_name, daily_limit_cents, meta_target_cents").maybeSingle(),
    sb.from("daily_snapshots").select("*").eq("on_date", todayKey).maybeSingle(),
    sb.from("money_events")
      .select("amount_cents, kind, occurred_at")
      .gte("occurred_at", addDays(today, -7).toISOString())
      .order("occurred_at", { ascending: true }),
    sb.from("money_events")
      .select("amount_cents, kind")
      .gte("occurred_at", yearAgo),
    sb.from("habits").select("id, name, emoji, anti_fuga").order("anti_fuga", { ascending: false }),
    sb.from("habit_hits")
      .select("habit_id, hit_date")
      .eq("hit_date", todayKey),
    sb.from("debts")
      .select("id, name, total_cents, due_at")
      .is("closed_at", null)
      .not("due_at", "is", null)
      .order("due_at", { ascending: true })
      .limit(3),
    sb.from("money_events")
      .select("id, occurred_at, kind, amount_cents, merchant, need, categories(name, emoji)")
      .gte("occurred_at", today.toISOString())
      .lt("occurred_at", addDays(today, 1).toISOString())
      .order("occurred_at", { ascending: false })
      .limit(4)
      .returns<Ev[]>(),
    sb.from("money_events")
      .select("id, occurred_at, amount_cents, merchant")
      .eq("kind", "income")
      .gte("occurred_at", monthStart)
      .order("occurred_at", { ascending: false })
      .returns<IncomeEv[]>(),
  ]);

  // ─ Stability (null when no snapshot)
  const hasSnap = !!snap;
  const stability = snap?.stability ?? null;
  const pillars = {
    capital:    snap?.pillar_capital    ?? null,
    discipline: snap?.pillar_discipline ?? null,
    antifuga:   snap?.pillar_antifuga   ?? null,
  };

  // ─ 7-day momentum sparkline
  const series: number[] = [];
  let weeklyDelta = 0;
  for (let i = 6; i >= 0; i--) {
    const d = addDays(today, -i).toISOString().slice(0,10);
    const dayEvs = (ev7 ?? []).filter(e => e.occurred_at.slice(0,10) === d);
    const inc = dayEvs.filter(e => e.kind === "income").reduce((s,e)=>s+Number(e.amount_cents),0);
    const exp = dayEvs.filter(e => e.kind === "expense").reduce((s,e)=>s+Number(e.amount_cents),0);
    const net = (inc - exp) / 100;
    series.push(net);
    weeklyDelta += net;
  }

  // ─ Meta progress
  const allEvs = allEvents ?? [];
  const saved = allEvs.reduce((s,e) =>
    s + (e.kind === "income" ? Number(e.amount_cents) : e.kind === "expense" ? -Number(e.amount_cents) : 0), 0
  );
  const target = Number(profile?.meta_target_cents ?? 2_000_000_000);
  const metaPct = Math.max(0, Math.min(100, (saved / target) * 100));

  // ─ Income this month
  const incomeEvs = incomeEvRaw ?? [];
  const totalIncomeMes = incomeEvs.reduce((s, e) => s + Number(e.amount_cents), 0);
  // Group by merchant to show sources
  const bySource = new Map<string, number>();
  for (const e of incomeEvs) {
    const k = e.merchant ?? "Sin descripción";
    bySource.set(k, (bySource.get(k) ?? 0) + Number(e.amount_cents));
  }
  const topSources = [...bySource.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  // ─ Main habit + racha
  const mainHabit = (habits ?? []).find(h => h.anti_fuga) ?? (habits ?? [])[0];
  const rachaSnap = snap?.streak_clean_days ?? 0;

  // ─ Próximas acciones
  const hitSet = new Set((hits ?? []).map((h: HabitHit) => h.habit_id));
  const actions: { icon: Parameters<typeof Icon>[0]["name"]; tag: string; tagKind: string; title: string; sub: string; pri: string; href: string }[] = [];

  (habits ?? []).filter(h => h.anti_fuga && !hitSet.has(h.id)).forEach(h => {
    actions.push({ icon:"shield", tag:"ANTI-FUGA", tagKind:"green",
      title:`Mantener ${h.name.toLowerCase()}`, sub:"Marca al final del día", pri:"P0", href:"/habits" });
  });

  (debts ?? []).forEach((d: Debt) => {
    const days = Math.floor((new Date(d.due_at!).getTime() - Date.now()) / 86400000);
    if (days < 30) actions.push({
      icon:"wallet", tag:"DEUDA", tagKind: days < 7 ? "amber" : "blue",
      title:`${d.name} · ${fmtCOP(d.total_cents)}`,
      sub: days <= 0 ? "¡Vencida!" : `Vence en ${days}d`,
      pri: days < 7 ? "P0" : "P1",
      href:"/meta",
    });
  });

  const todayEv = todayEvRaw ?? [];
  if (todayEv.length === 0) {
    actions.push({ icon:"plus", tag:"CAPTURA", tagKind:"blue",
      title:"Registra tu primer movimiento del día", sub:"Toca el botón verde", pri:"P1", href:"/capture" });
  }

  const monthName = today.toLocaleDateString("es-CO", { month: "long", timeZone: TZ });

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">
      <header className="flex items-end justify-between">
        <div>
          <div className="micro">{new Date().toLocaleDateString("es-CO", { weekday:"long", day:"numeric", month:"short", timeZone:TZ }).toUpperCase()}</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">
            {profile?.full_name ?? "Brayan"}
          </h1>
        </div>
        <Link href="/operator" className="size-9 rounded-[10px] grid place-items-center text-fg-2"
          style={{background:'var(--color-bg-2)', border:'1px solid var(--color-hair)'}}>
          <Icon name="bell" size={16}/>
        </Link>
      </header>

      {/* ─ Stability Hero ─────────────────────────────────────── */}
      <Card glow>
        <div className="flex justify-between items-start relative overflow-hidden">
          <div className="absolute pointer-events-none"
            style={{right:-40, top:-40, width:180, height:180,
              background:'radial-gradient(circle, oklch(.85 .18 150 / .25), transparent 70%)', borderRadius:'50%'}}/>
          <div className="relative">
            <div className="micro">ÍNDICE DE ESTABILIDAD · HOY</div>
            {hasSnap ? (
              <>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="mono font-medium text-[62px] leading-none tracking-tight" style={{color:'var(--color-accent)'}}>{stability}</span>
                  <span className="mono text-[14px] text-fg-4">/100</span>
                </div>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Icon name="trend" size={12} className="text-accent"/>
                  <span className="mono text-[11.5px] text-accent">{allEvs.length} eventos registrados</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="mono font-medium text-[48px] leading-none tracking-tight text-fg-3">—</span>
                </div>
                <div className="mono text-[11.5px] text-fg-4 mt-1.5">
                  Registra gastos e ingresos para calcular tu índice
                </div>
              </>
            )}
          </div>
          <Ring pct={stability ?? 0} size={94}/>
        </div>
        <div className="mt-3.5 grid grid-cols-3 gap-2">
          <Pillar lbl="CAPITAL"    v={pillars.capital}/>
          <Pillar lbl="DISCIPLINA" v={pillars.discipline}/>
          <Pillar lbl="ANTI-FUGA"  v={pillars.antifuga}/>
        </div>
      </Card>

      {/* ─ Ingresos este mes ──────────────────────────────────── */}
      <Card>
        <div className="flex justify-between items-center mb-3">
          <div>
            <div className="micro">INGRESOS · {monthName.toUpperCase()}</div>
            <div className="mono text-[26px] font-medium mt-1 leading-none" style={{color: totalIncomeMes > 0 ? "var(--color-accent)" : "var(--color-fg-3)"}}>
              {totalIncomeMes > 0 ? fmtCOP(totalIncomeMes) : "—"}
            </div>
          </div>
          <Link href="/capture?kind=income"
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-[10px] text-[13px] font-semibold"
            style={{background:"var(--color-accent)", color:"var(--color-bg-0)"}}>
            <Icon name="plus" size={14} stroke={2.4}/>
            Ingreso
          </Link>
        </div>

        {topSources.length > 0 ? (
          <div className="flex flex-col">
            {topSources.map(([src, amt], i) => (
              <div key={i} className="flex justify-between items-center py-2"
                style={{borderTop: i ? "1px solid var(--color-hair)" : "none"}}>
                <div className="flex items-center gap-2">
                  <span style={{
                    width:7, height:7, borderRadius:"50%",
                    background:"var(--color-accent)", display:"inline-block", flexShrink:0,
                  }}/>
                  <span className="text-[13px]">{src}</span>
                </div>
                <span className="mono text-[13px] font-medium" style={{color:"var(--color-accent)"}}>
                  {fmtCOP(amt)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-3">
            <div className="text-[12.5px] text-fg-3">Sin ingresos registrados este mes</div>
            <div className="mono text-[11px] text-fg-4 mt-1">Toca "+ Ingreso" para registrar tu salario o ingreso extra</div>
          </div>
        )}

        {incomeEvs.length > 3 && (
          <Link href="/today" className="mono text-[10.5px] text-fg-4 mt-2 block text-right">
            Ver todos ({incomeEvs.length}) →
          </Link>
        )}
      </Card>

      {/* ─ Momentum 7D ────────────────────────────────────────── */}
      <Card>
        <div className="flex justify-between items-start mb-2.5">
          <div>
            <div className="micro">FLUJO NETO · 7 DÍAS</div>
            <div className="mono text-[22px] font-medium mt-1">
              {weeklyDelta >= 0 ? "+" : ""}{fmtCOP(weeklyDelta * 100)}{" "}
              <span className="text-[13px] text-fg-3">{weeklyDelta >= 0 ? "al ahorro" : "al gasto"}</span>
            </div>
          </div>
          <Pill kind={weeklyDelta >= 0 ? "green" : "amber"}>{weeklyDelta >= 0 ? "↗ 7D" : "↘ 7D"}</Pill>
        </div>
        <Sparkline data={series}/>
        <div className="grid mt-1.5" style={{gridTemplateColumns:"repeat(7,1fr)"}}>
          {["L","M","M","J","V","S","D"].map((d,i) => (
            <div key={i} className="mono text-center" style={{fontSize:9.5, color: i === 6 ? "var(--color-accent)" : "var(--color-fg-4)"}}>{d}</div>
          ))}
        </div>
      </Card>

      {/* ─ Meta + Racha 2-col ─────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/meta">
          <Card className="cursor-pointer h-full">
            <div className="flex justify-between items-start">
              <span className="micro" style={{fontSize:9.5}}>META 20M</span>
              <Pill kind="green" className="text-[10px]">{metaPct.toFixed(1)}%</Pill>
            </div>
            <div className="mono text-[22px] mt-2 font-medium">{fmtCOP(Math.max(0, saved))}</div>
            <div className="mono text-[10.5px] text-fg-3 mt-0.5">/ {fmtCOP(target)}</div>
            <div className="mt-2"><Bar pct={metaPct} style={{height:5}}/></div>
            <div className="mono text-[10px] text-fg-4 mt-1.5">
              {metaPct < 1 ? "EMPIEZA YA" : `${(100 - metaPct).toFixed(1)}% RESTANTE`}
            </div>
          </Card>
        </Link>
        <Link href="/habits">
          <Card className="cursor-pointer h-full">
            <div className="flex justify-between items-start">
              <span className="micro" style={{fontSize:9.5}}>RACHA</span>
              <Icon name="flame" size={14} style={{color: rachaSnap > 0 ? "var(--color-accent)" : "var(--color-fg-4)"}}/>
            </div>
            <div className="mono mt-2 font-medium leading-none" style={{fontSize:32, color: rachaSnap > 0 ? "var(--color-accent)" : "var(--color-fg-3)"}}>
              {rachaSnap}<span className="text-[14px] text-fg-3 ml-1">{rachaSnap === 1 ? "día" : "días"}</span>
            </div>
            <div className="mono text-[10.5px] text-fg-3 mt-1">{mainHabit?.name ?? "Sin hábitos aún"}</div>
            <div className="flex gap-[3px] mt-2.5">
              {Array.from({length:18}).map((_,i) => (
                <span key={i} className="flex-1 rounded-[2px]" style={{
                  height:5,
                  background: i < rachaSnap ? "var(--color-accent)" : "var(--color-bg-2)",
                  boxShadow: i === rachaSnap - 1 ? "0 0 8px var(--color-accent)" : "none",
                }}/>
              ))}
            </div>
          </Card>
        </Link>
      </div>

      {/* ─ Próximas acciones ──────────────────────────────────── */}
      {actions.length > 0 && (
        <section>
          <div className="flex justify-between items-center pt-2 pb-2.5 px-1">
            <span className="micro">PRÓXIMAS ACCIONES</span>
            <span className="mono text-[10.5px] text-accent-2">{actions.length}</span>
          </div>
          <div className="flex flex-col">
            {actions.slice(0,4).map((a, i) => (
              <Link key={i} href={a.href} className="flex items-center gap-3 py-3 px-1"
                style={{borderTop: i ? "1px solid var(--color-hair)" : "none"}}>
                <div className="size-[34px] rounded-[10px] grid place-items-center shrink-0 text-fg-2"
                  style={{background:"var(--color-bg-2)", border:"1px solid var(--color-hair)"}}>
                  <Icon name={a.icon} size={15}/>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mb-0.5">
                    <Pill kind={a.tagKind as any}>{a.tag}</Pill>
                    <Pill>{a.pri}</Pill>
                  </div>
                  <div className="text-[13.5px] font-medium truncate">{a.title}</div>
                  <div className="mono text-[10.5px] text-fg-4 mt-0.5">{a.sub}</div>
                </div>
                <Icon name="chev" size={14} className="text-fg-4 shrink-0"/>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ─ Últimos movimientos de hoy ─────────────────────────── */}
      {todayEv.length > 0 && (
        <section>
          <div className="flex justify-between items-center pt-2 pb-2.5 px-1">
            <span className="micro">HOY · {todayEv.length} MOVIMIENTO{todayEv.length !== 1 ? "S" : ""}</span>
            <Link href="/today" className="mono text-[10.5px] text-accent-2">Ver todo →</Link>
          </div>
          <div className="flex flex-col gap-1.5">
            {todayEv.map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-card border"
                style={{background:"oklch(0.18 .007 250 / .5)", borderColor:"var(--color-hair)"}}>
                <div className="size-9 rounded-[10px] grid place-items-center text-lg shrink-0"
                  style={{background:"var(--color-bg-2)", border:"1px solid var(--color-hair)"}}>
                  {e.categories?.emoji ?? (e.kind === "income" ? "💼" : "💳")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{e.merchant ?? e.categories?.name ?? "Sin descripción"}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="mono text-[10px] text-fg-4">{fmtTime(e.occurred_at)}</span>
                    {e.need && <Pill kind={e.need === "impulse" ? "amber" : e.need === "protected" ? "green" : "plain"}>{e.need}</Pill>}
                  </div>
                </div>
                <span className={"mono text-[14px] font-medium whitespace-nowrap " + (e.kind === "income" || e.kind === "block" ? "text-accent" : "")}>
                  {e.kind === "income" || e.kind === "block" ? "+" : "−"}{fmtCOP(e.amount_cents)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─ Perspectiva ────────────────────────────────────────── */}
      <Card>
        <div className="flex items-center gap-2 mb-2">
          <Icon name="ai" size={14} className="text-accent"/>
          <span className="micro text-accent">PERSPECTIVA DEL DÍA</span>
        </div>
        <p className="text-[13.5px] leading-relaxed text-fg-2">
          {allEvs.length === 0
            ? "Registra tu primer movimiento para que el sistema genere perspectivas con tus datos reales."
            : weeklyDelta > 0
              ? <>Si mantienes el ritmo, ahorras <strong style={{color:"var(--color-accent)"}}>{fmtCOP(weeklyDelta * 100 * 4)}</strong> en 4 semanas. Recortar 1 fuga te adelanta ~5 días al objetivo.</>
              : <>Tu flujo esta semana es negativo. Revisa <strong style={{color:"var(--color-warn)"}}>categorías de riesgo</strong> y considera reducir gastos.</>
          }
        </p>
        <Link href="/operator" className="mt-2.5 flex items-center gap-1.5 text-[12px] font-medium text-fg-3 hover:text-fg">
          Abrir operador <Icon name="arrow" size={12}/>
        </Link>
      </Card>
    </div>
  );
}

// ─ Pillar con grado o "—" ────────────────────────────────────
function Pillar({ lbl, v }: { lbl: string; v: number | null }) {
  if (v === null) {
    return (
      <div className="rounded-[10px] p-2.5 border" style={{background:"var(--color-bg-1)", borderColor:"var(--color-hair)"}}>
        <div className="micro" style={{fontSize:9, letterSpacing:".12em"}}>{lbl}</div>
        <div className="mono text-[18px] font-medium mt-1 text-fg-4">—</div>
      </div>
    );
  }
  const grade = v >= 90 ? "A+" : v >= 80 ? "A" : v >= 70 ? "A−" : v >= 60 ? "B+" : v >= 50 ? "B" : v >= 40 ? "C+" : v >= 30 ? "C" : "D";
  const col   = v >= 70 ? "var(--color-accent)" : v >= 50 ? "var(--color-warn)" : "var(--color-danger)";
  return (
    <div className="rounded-[10px] p-2.5 border" style={{background:"var(--color-bg-1)", borderColor:"var(--color-hair)"}}>
      <div className="micro" style={{fontSize:9, letterSpacing:".12em"}}>{lbl}</div>
      <div className="mono text-[18px] font-medium mt-1" style={{color: col}}>{grade}</div>
    </div>
  );
}

// ─ Sparkline SVG ─────────────────────────────────────────────
function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <div className="rounded-[8px]" style={{height:50, background:"var(--color-bg-2)"}}/>;
  const W = 320, H = 50;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max - min || 1;
  const xs = (i: number) => (i / (data.length - 1)) * W;
  const ys = (v: number) => H - ((v - min) / range) * (H - 6) - 3;
  const pts = data.map((v,i) => `${xs(i)},${ys(v)}`).join(" ");
  const color = "var(--color-accent)";
  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" style={{width:"100%", height:H, display:"block"}}>
      <defs>
        <linearGradient id="spg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${H} ${pts} ${W},${H}`} fill="url(#spg)"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={xs(data.length-1)} cy={ys(data[data.length-1])} r="3.5" fill={color}
        style={{filter:`drop-shadow(0 0 4px ${color})`}}/>
    </svg>
  );
}
