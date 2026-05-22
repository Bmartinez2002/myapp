import { supabaseServer } from "@/lib/supabase/server";
import { startOfLocalDay, TZ, addDays } from "@/lib/dates";
import { fmtCOP } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { Bar } from "@/components/ui/Bar";
import { Icon } from "@/components/ui/Icon";
import { EventFeed, type EventRow } from "@/components/feature/EventFeed";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function TodayPage() {
  const sb = await supabaseServer();
  const today = startOfLocalDay();
  const tomorrow = addDays(today, 1);

  const [{ data: eventsRaw }, { data: profile }, { data: catsRaw }] = await Promise.all([
    sb
      .from("money_events")
      .select("id, occurred_at, kind, amount_cents, merchant, need, note, categories(name, emoji, risk_tier)")
      .gte("occurred_at", today.toISOString())
      .lt("occurred_at", tomorrow.toISOString())
      .order("occurred_at", { ascending: false })
      .returns<EventRow[]>(),
    sb.from("profiles").select("full_name, daily_limit_cents").maybeSingle(),
    sb.from("categories").select("id, name, emoji, risk_tier").order("name"),
  ]);

  const dailyLimit = Number(profile?.daily_limit_cents ?? 3300000);
  const evs = eventsRaw ?? [];
  const cats = (catsRaw ?? []) as { id: string; name: string; emoji: string | null; risk_tier: string | null }[];
  const spent     = evs.filter(e => e.kind === "expense").reduce((s, e) => s + Number(e.amount_cents), 0);
  const income    = evs.filter(e => e.kind === "income").reduce((s, e)  => s + Number(e.amount_cents), 0);
  const protected_ = evs.filter(e => e.kind === "block").reduce((s, e)  => s + Number(e.amount_cents), 0);
  const ratio = Math.min(100, (spent / dailyLimit) * 100);

  // group by time-of-day
  const buckets: Record<string, EventRow[]> = { morning: [], afternoon: [], night: [] };
  evs.forEach(e => {
    const h = new Date(e.occurred_at).toLocaleString("en-US", { hour: "numeric", hour12: false, timeZone: "America/Bogota" });
    const hour = parseInt(h);
    const part = hour < 12 ? "morning" : hour < 18 ? "afternoon" : "night";
    buckets[part].push(e);
  });

  const partLabel: Record<string, string> = {
    morning:   "MAÑANA · 6–12h",
    afternoon: "TARDE · 12–18h",
    night:     "NOCHE · 18–24h",
  };

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">
      <header className="flex items-end justify-between">
        <div>
          <div className="micro">{new Date().toLocaleDateString("es-CO", { weekday:"long", day:"numeric", month:"short", timeZone: TZ }).toUpperCase()}</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">Hoy</h1>
        </div>
        <Link href="/capture" className="size-9 rounded-[10px] grid place-items-center"
          style={{background:'linear-gradient(180deg, oklch(.93 .14 150), oklch(.78 .18 150))', boxShadow:'0 0 20px oklch(.85 .18 150 / .45)'}}>
          <Icon name="plus" size={18} stroke={2.2} className="text-bg-0"/>
        </Link>
      </header>

      {/* Day pacing */}
      <Card>
        <div className="flex justify-between items-start">
          <div>
            <div className="micro">GASTO DE HOY</div>
            <div className="mono text-[34px] font-medium tracking-tight mt-1 leading-none">{fmtCOP(spent)}</div>
          </div>
          <div className="text-right">
            <div className="micro">PROTEGIDO</div>
            <div className="mono text-[20px] mt-1" style={{color:'var(--color-accent)'}}>{fmtCOP(protected_)}</div>
          </div>
        </div>
        <div className="mt-3.5">
          <div className="flex justify-between mb-1.5">
            <span className="mono text-[10px] text-fg-4">LÍMITE · {fmtCOP(dailyLimit)}</span>
            <span className="mono text-[10px]" style={{color: ratio > 90 ? 'var(--color-danger)' : ratio > 70 ? 'var(--color-warn)' : 'var(--color-accent)'}}>{ratio.toFixed(0)}%</span>
          </div>
          <Bar pct={ratio}/>
        </div>
      </Card>

      {/* Feed por daypart */}
      {(["morning","afternoon","night"] as const).map(k => buckets[k].length > 0 && (
        <section key={k}>
          <div className="flex justify-between items-center pt-2 pb-1.5 px-1">
            <span className="micro">{partLabel[k]}</span>
            <span className="mono text-[10px]" style={{color:"var(--color-fg-4)"}}>TAP PARA EDITAR</span>
          </div>
          <EventFeed events={buckets[k]} cats={cats}/>
        </section>
      ))}

      {evs.length === 0 && (
        <Card className="text-center py-12">
          <div className="micro">SIN MOVIMIENTOS HOY</div>
          <div className="mt-3 text-fg-3 text-sm">Toca el botón verde para registrar el primero.</div>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <div style={{display:"flex", alignItems:"stretch"}}>
          <SumCell lbl="INGRESOS" v={fmtCOP(income)}           col="var(--color-accent)"/>
          <div style={{width:1, background:"var(--color-hair)", flexShrink:0}}/>
          <SumCell lbl="EGRESOS"  v={fmtCOP(spent)}/>
          <div style={{width:1, background:"var(--color-hair)", flexShrink:0}}/>
          <SumCell lbl="NETO"     v={(income - spent >= 0 ? "+" : "") + fmtCOP(income - spent)} col={income - spent >= 0 ? "var(--color-accent)" : "var(--color-danger)"}/>
        </div>
      </Card>
    </div>
  );
}

function SumCell({ lbl, v, col }: { lbl: string; v: string; col?: string }) {
  return (
    <div style={{flex:1, padding:"0 8px", textAlign:"center"}}>
      <div className="micro" style={{fontSize:9}}>{lbl}</div>
      <div className="mono text-[14px] font-medium mt-1" style={{color: col ?? 'var(--color-fg)'}}>{v}</div>
    </div>
  );
}
