import { cx } from "@/lib/cx";
import type { HTMLAttributes } from "react";

const styles = {
  plain: { bg:'oklch(0.22 .007 250)', bd:'var(--color-hair)', c:'var(--color-fg-2)' },
  green: { bg:'oklch(.85 .18 150 / .14)', bd:'oklch(.85 .18 150 / .3)', c:'var(--color-accent)' },
  blue:  { bg:'oklch(.72 .17 250 / .14)', bd:'oklch(.72 .17 250 / .3)', c:'var(--color-accent-2)' },
  amber: { bg:'oklch(.82 .16 80 / .13)', bd:'oklch(.82 .16 80 / .3)', c:'var(--color-warn)' },
  red:   { bg:'oklch(.7 .2 25 / .13)',   bd:'oklch(.7 .2 25 / .3)',   c:'var(--color-danger)' },
} as const;

export function Pill({ kind = "plain", className, ...p }: HTMLAttributes<HTMLSpanElement> & { kind?: keyof typeof styles }) {
  const s = styles[kind];
  return (
    <span
      {...p}
      className={cx("inline-flex items-center gap-1.5 px-2 py-0.5 rounded-chip text-[10.5px] mono tracking-wide", className)}
      style={{ background: s.bg, border: `1px solid ${s.bd}`, color: s.c }}
    />
  );
}
