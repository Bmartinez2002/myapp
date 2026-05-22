"use client";
import { useState, useTransition } from "react";
import { updateProfile } from "@/app/actions/settings";

function fmtCOP(dbCents: number) {
  const cop = Math.round(dbCents / 100);
  return cop >= 1_000_000
    ? `$${(cop / 1_000_000).toFixed(cop % 1_000_000 === 0 ? 0 : 1)}M`
    : `$${(cop / 1_000).toFixed(0)}K`;
}

type Props = {
  fullName:         string;
  dailyLimitCents:  number;
  metaTargetCents:  number;
};

export function SettingsForm({ fullName, dailyLimitCents, metaTargetCents }: Props) {
  const [name,        setName]        = useState(fullName);
  const [dailyLimit,  setDailyLimit]  = useState(dailyLimitCents);
  const [metaTarget,  setMetaTarget]  = useState(metaTargetCents);
  const [saved,       setSaved]       = useState(false);
  const [pending,     startTransition] = useTransition();

  function handleSave() {
    startTransition(async () => {
      await updateProfile({
        full_name:         name || undefined,
        daily_limit_cents: dailyLimit,
        meta_target_cents: metaTarget,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "10px 12px", borderRadius: 10,
    background: "var(--color-bg-1)", border: "1px solid var(--color-hair)",
    color: "var(--color-fg)", fontSize: 14, outline: "none",
  };

  const sliderStyle: React.CSSProperties = {
    width: "100%", accentColor: "var(--color-accent)", cursor: "pointer",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>

      {/* Name */}
      <div>
        <label className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)", display: "block", marginBottom: 6 }}>
          NOMBRE
        </label>
        <input
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Tu nombre"
          style={inputStyle}
        />
      </div>

      {/* Daily limit slider */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <label className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)" }}>
            LÍMITE DIARIO
          </label>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent)" }}>
            {fmtCOP(dailyLimit)}
          </span>
        </div>
        <input
          type="range"
          min={500_000_00}
          max={10_000_000_00}
          step={500_000_00}
          value={dailyLimit}
          onChange={e => setDailyLimit(Number(e.target.value))}
          style={sliderStyle}
        />
        <div style={{ display: "flex", justifyContent: "space-between" }} className="mono">
          <span style={{ fontSize: 10, color: "var(--color-fg-4)" }}>$50K</span>
          <span style={{ fontSize: 10, color: "var(--color-fg-4)" }}>$1M</span>
        </div>
      </div>

      {/* Meta target slider */}
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 6 }}>
          <label className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)" }}>
            META CAPITAL
          </label>
          <span style={{ fontSize: 14, fontWeight: 600, color: "var(--color-accent)" }}>
            {fmtCOP(metaTarget)}
          </span>
        </div>
        <input
          type="range"
          min={500_000_000_00}
          max={10_000_000_000_00}
          step={500_000_000_00}
          value={metaTarget}
          onChange={e => setMetaTarget(Number(e.target.value))}
          style={sliderStyle}
        />
        <div style={{ display: "flex", justifyContent: "space-between" }} className="mono">
          <span style={{ fontSize: 10, color: "var(--color-fg-4)" }}>$5M</span>
          <span style={{ fontSize: 10, color: "var(--color-fg-4)" }}>$100M</span>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={pending}
        style={{
          padding: "12px 0", borderRadius: 12, fontWeight: 600, fontSize: 14,
          background: saved ? "oklch(0.85 0.18 150 / .15)" : "var(--color-accent)",
          color: saved ? "var(--color-accent)" : "var(--color-bg-0)",
          border: saved ? "1px solid var(--color-accent)" : "none",
          cursor: pending ? "not-allowed" : "pointer",
          opacity: pending ? 0.6 : 1,
          transition: "all .2s",
        }}
      >
        {saved ? "GUARDADO ✓" : pending ? "GUARDANDO…" : "GUARDAR CAMBIOS"}
      </button>
    </div>
  );
}
