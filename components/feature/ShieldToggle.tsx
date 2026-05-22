"use client";
import { useTransition, useOptimistic } from "react";
import { toggleBlindaje } from "@/app/actions/prefs";

export function ShieldToggle({ initial }: { initial: boolean }) {
  const [, startT] = useTransition();
  const [on, applyOptimistic] = useOptimistic(initial, (_prev: boolean, next: boolean) => next);

  function tap() {
    startT(async () => {
      applyOptimistic(!on);
      await toggleBlindaje();
    });
  }

  return (
    <button
      onClick={tap}
      aria-pressed={on}
      style={{
        width: 42, height: 24, borderRadius: 99, padding: 2,
        display: "inline-flex", alignItems: "center",
        background: on ? "oklch(.85 .18 150 / .3)" : "var(--color-bg-2)",
        border: "1px solid " + (on ? "oklch(.85 .18 150 / .6)" : "var(--color-hair)"),
        flexShrink: 0, cursor: "pointer",
      }}
    >
      <span style={{
        width: 18, height: 18, borderRadius: "50%",
        background: on ? "var(--color-accent)" : "var(--color-fg-4)",
        marginLeft: on ? 16 : 0,
        transition: ".15s",
        boxShadow: on ? "0 0 8px var(--color-accent)" : "none",
        display: "block",
      }} />
    </button>
  );
}
