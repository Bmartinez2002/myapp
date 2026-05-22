import { cx } from "@/lib/cx";
import type { HTMLAttributes } from "react";

export function Card({ className, glow, ...p }: HTMLAttributes<HTMLDivElement> & { glow?: boolean }) {
  return (
    <div
      {...p}
      className={cx(
        "rounded-card border p-4 relative overflow-hidden",
        glow && "shadow-[0_0_0_1px_oklch(0.85_0.18_150_/_.12),0_24px_60px_-30px_oklch(0.85_0.18_150_/_.35)]",
        className
      )}
      style={{
        background:'linear-gradient(180deg, oklch(0.19 .007 250) 0%, oklch(0.16 .006 250) 100%)',
        borderColor:'var(--color-hair)',
      }}
    />
  );
}
