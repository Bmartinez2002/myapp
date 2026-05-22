import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";

export const dynamic = "force-dynamic";

const items = [
  { href: "/today",    icon: "pulse"  as const, label: "Today",         sub: "Feed cronológico del día",   color: "var(--color-accent)" },
  { href: "/anti-fuga",icon: "shield" as const, label: "Anti-fuga",     sub: "Índice de fuga · categorías",color: "var(--color-warn)" },
  { href: "/ceo",      icon: "brief"  as const, label: "CEO Mode",      sub: "Proyectos · pipeline",       color: "var(--color-accent-2)" },
  { href: "/review",   icon: "cal"    as const, label: "Weekly Review", sub: "Cierre semanal · 6 pasos",   color: "var(--color-accent-2)" },
  { href: "/operator", icon: "ai"     as const, label: "AI Operator",   sub: "Chat con tu operador IA",    color: "var(--color-accent)" },
  { href: "/settings", icon: "cog"    as const, label: "Settings",      sub: "Datos · perfil · export",    color: "var(--color-fg-3)" },
];

export default function MorePage() {
  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">
      <header>
        <div className="micro">ENTRADAS · ACCESO RÁPIDO</div>
        <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">Más</h1>
      </header>

      {/* Daily Briefing hero */}
      <Link href="/operator">
        <Card glow className="cursor-pointer">
          <div className="flex items-center gap-3.5">
            <div className="size-11 rounded-[12px] grid place-items-center shrink-0 text-bg-0"
              style={{background:'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))', boxShadow:'0 0 20px oklch(.85 .18 150 / .4)'}}>
              <Icon name="ai" size={20} stroke={2}/>
            </div>
            <div className="flex-1">
              <div className="text-[14px] font-semibold">Daily Briefing</div>
              <div className="mono text-[11px] text-fg-4 mt-0.5">Pantalla de bloqueo + briefing IA</div>
            </div>
            <Icon name="chev" size={14} className="text-fg-3"/>
          </div>
        </Card>
      </Link>

      {/* Menu items */}
      <div className="flex flex-col gap-2">
        {items.map(it => (
          <Link key={it.href} href={it.href}>
            <div className="rounded-card border p-3.5 flex items-center gap-3.5 cursor-pointer"
              style={{background:'oklch(0.18 .007 250)', borderColor:'var(--color-hair)'}}>
              <div className="size-[38px] rounded-[11px] grid place-items-center shrink-0"
                style={{background:'var(--color-bg-2)', border:'1px solid var(--color-hair)', color: it.color}}>
                <Icon name={it.icon} size={18}/>
              </div>
              <div className="flex-1">
                <div className="text-[13.5px] font-semibold">{it.label}</div>
                <div className="mono text-[11px] text-fg-4 mt-0.5">{it.sub}</div>
              </div>
              <Icon name="chev" size={14} className="text-fg-4"/>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
