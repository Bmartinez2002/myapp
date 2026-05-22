import Link from "next/link";
import { Icon } from "@/components/ui/Icon";
import { supabaseServer } from "@/lib/supabase/server";
import { TabBar } from "@/components/feature/TabBar";
import { KeyboardShortcuts } from "@/components/feature/KeyboardShortcuts";
import { PageMotion } from "@/components/feature/PageMotion";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const sb = await supabaseServer();
  const { data: { user } } = await sb.auth.getUser();
  const initials = (user?.email?.[0] ?? "B").toUpperCase();

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[224px_1fr]">
      {/* Desktop rail */}
      <aside className="hidden md:flex flex-col border-r p-4 gap-1 sticky top-0 h-dvh" style={{borderColor:'var(--color-hair)'}}>
        <div className="flex items-center gap-2.5 px-2 pb-3 mb-2 border-b" style={{borderColor:'var(--color-hair)'}}>
          <div className="size-7 rounded-[8px] relative" style={{background:'conic-gradient(from 210deg at 50% 50%, var(--color-accent), var(--color-accent-2), var(--color-accent))', boxShadow:'0 0 16px oklch(0.85 0.18 150 / .35)'}}>
            <div className="absolute inset-[5px] rounded-[4px]" style={{background:'var(--color-bg-0)'}}/>
            <div className="absolute inset-[9px] rounded-[2px]" style={{background:'linear-gradient(135deg, var(--color-accent), var(--color-accent-2))'}}/>
          </div>
          <div>
            <div className="text-[14px] font-semibold tracking-tight">BRAYAN<span className="text-fg-3 font-mono"> / OS</span></div>
            <div className="micro" style={{fontSize:9.5}}>v0.1 · ALPHA</div>
          </div>
        </div>
        <RailLink href="/"         icon="home"   label="Home"/>
        <RailLink href="/today"    icon="pulse"  label="Today"/>
        <RailLink href="/meta"     icon="target" label="Meta 20M"/>
        <RailLink href="/habits"   icon="flame"  label="Hábitos"/>
        <RailLink href="/anti-fuga"icon="shield" label="Anti-fuga"/>
        <RailLink href="/ceo"      icon="brief"  label="CEO Mode"/>
        <RailLink href="/review"   icon="cal"    label="Weekly Review"/>
        <RailLink href="/operator" icon="ai"     label="AI Operator"/>
        <div className="mt-2 px-2.5 py-1.5 rounded-[7px] border text-[11px] mono text-fg-4"
          style={{borderColor:'var(--color-hair)', background:'var(--color-bg-1)'}}>
          <span className="text-fg-3">⌘K</span> Capturar &nbsp;·&nbsp; <span className="text-fg-3">G</span> Gasto &nbsp;·&nbsp; <span className="text-fg-3">H</span> Hábitos
        </div>
        <div className="mt-auto pt-3 border-t flex items-center gap-2" style={{borderColor:'var(--color-hair)'}}>
          <div className="size-8 rounded-full grid place-items-center text-bg-0 text-xs font-semibold mono" style={{background:'linear-gradient(135deg, oklch(.72 .17 250), oklch(.85 .18 150))'}}>{initials}</div>
          <div className="flex-1 min-w-0">
            <div className="text-xs truncate">{user?.email}</div>
            <div className="micro" style={{fontSize:9.5}}>OPERATOR · LVL 7</div>
          </div>
          <Link href="/settings" className="text-fg-3"><Icon name="cog" size={14}/></Link>
        </div>
      </aside>

      <main className="pb-24 md:pb-0"><PageMotion>{children}</PageMotion></main>

      {/* Mobile tabs */}
      <TabBar />

      {/* Desktop keyboard shortcuts */}
      <KeyboardShortcuts />
    </div>
  );
}

function RailLink({ href, icon, label }: { href: React.ComponentProps<typeof Link>["href"]; icon: Parameters<typeof Icon>[0]["name"]; label: string }) {
  return (
    <Link href={href} className="flex items-center gap-2.5 px-2.5 py-2 rounded-[7px] text-[13px] text-fg-2 hover:bg-bg-1">
      <Icon name={icon} size={16}/>
      <span>{label}</span>
    </Link>
  );
}
