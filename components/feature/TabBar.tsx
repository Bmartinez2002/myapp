"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { cx } from "@/lib/cx";

const tabs = [
  { href: "/",        label: "Home",  icon: "home"   as const, active: (p: string) => p === "/" },
  { href: "/today",   label: "Today", icon: "pulse"  as const, active: (p: string) => p === "/today" || p.startsWith("/anti-fuga") || p.startsWith("/operator") },
  { href: "/capture", label: "",      icon: "plus"   as const, fab: true },
  { href: "/meta",    label: "Meta",  icon: "target" as const, active: (p: string) => p === "/meta" || p.startsWith("/habits") },
  { href: "/more",    label: "Más",   icon: "more"   as const, active: (p: string) => ["/more","/ceo","/review","/settings"].some(r => p === r || p.startsWith(r+"/")) },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav
      className="md:hidden fixed left-3 right-3 bottom-3 z-50 grid items-center"
      style={{
        gridTemplateColumns: "1fr 1fr 72px 1fr 1fr",
        background: "oklch(0.16 .006 250 / .82)",
        backdropFilter: "blur(18px)",
        border: "1px solid oklch(0.3 .008 250 / .7)",
        borderRadius: 22,
        padding: 8,
        boxShadow: "0 20px 40px -10px oklch(0 0 0 / .6), 0 0 0 1px oklch(1 0 0 / .03) inset",
        paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
      }}
    >
      {tabs.map((t) => {
        const active = t.active?.(path) ?? false;
        if (t.fab) return (
          <Link key="fab" href={t.href} className="justify-self-center size-[54px] rounded-full grid place-items-center text-bg-0"
            style={{ background:'linear-gradient(180deg, oklch(.93 .14 150), oklch(.78 .18 150))', boxShadow:'0 0 0 1px oklch(.85 .18 150 / .5), 0 0 28px oklch(.85 .18 150 / .55)' }}>
            <Icon name={t.icon} size={24} stroke={2.2}/>
          </Link>
        );
        return (
          <Link key={t.href} href={t.href} className={cx("flex flex-col items-center gap-1 py-1.5", active ? "text-accent" : "text-fg-3")}>
            <Icon name={t.icon} size={18}/>
            <span className="text-[9.5px] mono tracking-wider uppercase">{t.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
