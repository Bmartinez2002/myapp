"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";

function bogotaTime(): string {
  const bog = new Date(new Date().getTime() - 5 * 3_600_000);
  return `${bog.getUTCHours()}:${String(bog.getUTCMinutes()).padStart(2, "0")}`;
}

type Props = {
  stability:  number;
  streak:     number;
  briefing:   string | null;
  eventCount: number;
  dueCount:   number;
};

export function LockScreen({ stability, streak, briefing, eventCount, dueCount }: Props) {
  const router          = useRouter();
  const [time, setTime] = useState(bogotaTime());

  useEffect(() => {
    const id = setInterval(() => setTime(bogotaTime()), 30_000);
    return () => clearInterval(id);
  }, []);

  const defaultText = `Sistema en ${stability}/100.${streak > 0 ? ` Racha ${streak} activa.` : ""}${eventCount === 0 ? " Empieza registrando tu primer movimiento." : ""}`;

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 100,
      display: "flex", flexDirection: "column", justifyContent: "space-between",
      background: "radial-gradient(120% 60% at 50% 0%, oklch(0.22 .03 250) 0%, oklch(0.08 .01 250) 60%), oklch(0.06 .005 250)",
      paddingTop: "max(env(safe-area-inset-top, 0px), 50px)",
    }}>

      {/* ─ Clock ──────────────────────────────────────────────── */}
      <div style={{ padding: "14px 24px", textAlign: "center" }}>
        <div className="mono" style={{ fontSize: 11.5, letterSpacing: ".18em", color: "var(--color-fg-3)" }}>
          BRAYAN OS · SISTEMA OPERATIVO
        </div>
        <div style={{
          fontSize: 78, fontWeight: 300, letterSpacing: "-.04em",
          marginTop: 4, lineHeight: 1, color: "var(--color-fg)",
          fontFamily: "var(--font-sans, sans-serif)",
        }}>
          {time}
        </div>
      </div>

      {/* ─ Cards ──────────────────────────────────────────────── */}
      <div style={{ padding: "0 16px", display: "flex", flexDirection: "column", gap: 10 }}>

        {/* Briefing */}
        <div style={{
          background: "oklch(.85 .18 150 / .12)", border: "1px solid oklch(.85 .18 150 / .35)",
          borderRadius: 18, padding: "14px 16px", backdropFilter: "blur(20px)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
            <Icon name="ai" size={16} style={{ color: "var(--color-accent)" }} />
            <span className="mono" style={{ fontSize: 10.5, letterSpacing: ".14em", color: "var(--color-accent)" }}>
              BRAYAN OS · DAILY BRIEFING
            </span>
            <span className="mono" style={{ marginLeft: "auto", fontSize: 10, color: "var(--color-fg-4)" }}>{time}</span>
          </div>
          <div style={{ fontSize: 14, lineHeight: 1.45, fontWeight: 500, whiteSpace: "pre-wrap" }}>
            {briefing ?? defaultText}
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
            <Pill kind="green">PUNTAJE {stability}</Pill>
            {streak > 0  && <Pill kind="blue">RACHA {streak}D</Pill>}
            {dueCount > 0 && <Pill kind="amber">{dueCount} VENCIMIENTOS</Pill>}
          </div>
        </div>

        {/* Events count */}
        {eventCount > 0 && (
          <div style={{
            background: "oklch(0.16 .006 250 / .7)", border: "1px solid oklch(0.3 .008 250 / .6)",
            borderRadius: 18, padding: "12px 14px", backdropFilter: "blur(20px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "oklch(0.25 .008 250)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name="wallet" size={16} style={{ color: "var(--color-accent)" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>{eventCount} eventos registrados</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 2 }}>Tu sistema sabe lo que pasa</div>
              </div>
            </div>
          </div>
        )}

        {/* Streak */}
        {streak > 0 && (
          <div style={{
            background: "oklch(0.16 .006 250 / .7)", border: "1px solid oklch(0.3 .008 250 / .6)",
            borderRadius: 18, padding: "12px 14px", backdropFilter: "blur(20px)",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 30, height: 30, borderRadius: 9, background: "oklch(0.25 .008 250)", display: "grid", placeItems: "center", flexShrink: 0 }}>
                <Icon name="flame" size={16} style={{ color: "var(--color-accent-2)" }} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>Racha disciplina · día {streak}</div>
                <div className="mono" style={{ fontSize: 11, color: "var(--color-fg-3)", marginTop: 2 }}>Cero domicilios</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ─ Unlock button ──────────────────────────────────────── */}
      <button
        onClick={() => router.push("/operator")}
        style={{
          margin: "0 24px max(env(safe-area-inset-bottom, 0px), 40px)",
          padding: 14, borderRadius: 99, cursor: "pointer",
          background: "oklch(0.16 .006 250 / .8)",
          border: "1px solid oklch(0.3 .008 250 / .6)",
          backdropFilter: "blur(14px)", color: "var(--color-fg)",
          display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
        }}
      >
        <Icon name="chev" size={20} style={{ transform: "rotate(-90deg)", color: "var(--color-fg-3)" }} />
        <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)" }}>
          TOCA · ABRE OPERATOR
        </div>
      </button>
    </div>
  );
}
