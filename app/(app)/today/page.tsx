import { supabaseServer } from "@/lib/supabase/server";
import { startOfLocalDay, dayPart, fmtTime, TZ, addDays } from "@/lib/dates";
import { fmtCOP } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Bar } from "@/components/ui/Bar";
import { Icon } from "@/components/ui/Icon";
import Link from "next/link";

export const dynamic = "force-dynamic";

type Ev = {
  id: string;
  occurred_at: string;
  kind: string;
  amount_cents: number;
  merchant: string | null;
  need: string | null;
  note: string | null;
  categories: { name: string; emoji: string | null; risk_tier: string | null } | null;
};

export default async function TodayPage() {
  const sb = await supabaseServer();
  const today = startOfLocalDay();
  const tomorrow = addDays(today, 1);

  const [{ data: events = [] }, { data: profile }] = await Promise.all([
    sb
      .from("money_events")
      .select("id, occurred_at, kind, amount_cents, merchant, need, note, categories(name, emoji, risk_tier)")
      .gte("occurred_at", today.toISOString())
      .lt("occurred_at", tomorrow.toISOString())
      .order("occurred_at", { ascending: false })
      .returns<Ev[]>(),
    sb.from("profiles").select("full_name, daily_limit_cents").maybeSingle(),
  ]);

  const dailyLimit = Number(profile?.daily_limit_cents ?? 3300000);
  const evs = events ?? [];
  const spent     = evs.filter(e => e.kind === "expense").reduce((s, e) => s + Number(e.amount_cents), 0);
  const income    = evs.filter(e => e.kind === "income").reduce((s, e)  => s + Number(e.amount_cents), 0);
  const protected_ = evs.filter(e => e.kind === "block").reduce((s, e)  => s + Number(e.amount_cents), 0);
  const ratio = Math.min(100, (spent / dailyLimit) * 100);

  const buckets: Record<string, Ev[]> = { morning: [], afternoon: [], night: [] };
  evs.forEach(e => buckets[dayPart(e.occurred_at)].push(e));

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
          </div>
          <div className="flex flex-col gap-1.5">
            {buckets[k].map(e => (
              <div key={e.id} className="flex items-center gap-3 p-3 rounded-card border"
                style={{background:'oklch(0.18 .007 250 / .5)', borderColor:'var(--color-hair)'}}>
                <div className="size-9 rounded-[10px] grid place-items-center text-lg shrink-0"
                  style={{background:'var(--color-bg-2)', border:'1px solid var(--color-hair)'}}>
                  {e.categories?.emoji ?? (e.kind === "income" ? "💼" : "💳")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-medium truncate">{e.merchant ?? e.categories?.name ?? "Sin categoría"}</div>
                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
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
      ))}

      {evs.length === 0 && (
        <Card className="text-center py-12">
          <div className="micro">SIN MOVIMIENTOS HOY</div>
          <div className="mt-3 text-fg-3 text-sm">Toca el botón verde para registrar el primero.</div>
        </Card>
      )}

      {/* Summary */}
      <Card>
        <div className="grid grid-cols-3">
          <SumCell lbl="INGRESOS" v={fmtCOP(income)}           col="var(--color-accent)"/>
          <div className="border-l" style={{borderColor:'var(--color-hair)'}}/>
          <SumCell lbl="EGRESOS"  v={fmtCOP(spent)}/>
          <div className="border-l" style={{borderColor:'var(--color-hair)'}}/>
          <SumCell lbl="NETO"     v={(income - spent >= 0 ? "+" : "") + fmtCOP(income - spent)} col="var(--color-accent)"/>
        </div>
      </Card>
    </div>
  );
}

function SumCell({ lbl, v, col }: { lbl: string; v: string; col?: string }) {
  return (
    <div className="px-2 text-center">
      <div className="micro" style={{fontSize:9}}>{lbl}</div>
      <div className="mono text-[14px] font-medium mt-1" style={{color: col ?? 'var(--color-fg)'}}>{v}</div>
    </div>
  );
}
