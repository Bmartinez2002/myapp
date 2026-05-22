"use client";
import { useState, useTransition } from "react";
import type { CSSProperties } from "react";
import { fmtCOP } from "@/lib/money";
import { Icon } from "@/components/ui/Icon";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { saveWeeklyReview } from "@/app/actions/review";

export type ReviewStability = {
  score: number;
  pillars: { capital: number; discipline: number; antifuga: number };
};

export type PastReview = {
  id: string;
  week_start: string;
  stability: number | null;
  word: string | null;
  reflection: string | null;
};

type Props = {
  stability: ReviewStability;
  weekEventCount: number;
  monthEventCount: number;
  wins: string[];
  misses: string[];
  protectedCents: number;
  pastReviews: PastReview[];
  weekStart: string;
};

const TOTAL = 6;

function inputStyle(align: "center" | "left", size: number): CSSProperties {
  return {
    background: "var(--color-bg-2)", border: "1px solid var(--color-hair)",
    borderRadius: 10, padding: "10px 14px", fontSize: size,
    color: "var(--color-fg)", width: "100%", marginTop: 10,
    fontFamily: "inherit", textAlign: align, outline: "none",
    boxSizing: "border-box", display: "block",
  };
}

function btn(primary: boolean, flexVal: number): CSSProperties {
  return {
    flex: flexVal, padding: "11px 16px", borderRadius: 10, cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    fontFamily: "var(--font-mono, monospace)", fontSize: 12, letterSpacing: ".06em",
    fontWeight: primary ? 600 : 500,
    background: primary ? "var(--color-accent)" : "var(--color-bg-2)",
    color: primary ? "#06120c" : "var(--color-fg-2)",
    border: primary ? "none" : "1px solid var(--color-hair)",
  };
}

function BigMetric({ lbl, v, accent }: { lbl: string; v: number; accent?: boolean }) {
  return (
    <div>
      <div className="micro">{lbl}</div>
      <div className="mono mt-1.5" style={{ fontSize: 24, fontWeight: 500, color: accent ? "var(--color-accent)" : "var(--color-fg)" }}>
        {v}
      </div>
    </div>
  );
}

export function ReviewFlow({
  stability, weekEventCount, monthEventCount,
  wins, misses, protectedCents, pastReviews, weekStart,
}: Props) {
  const [step, setStep]               = useState(0);
  const [word, setWord]               = useState("");
  const [reflection, setReflection]   = useState("");
  const [commitments, setCommitments] = useState(["", "", ""]);
  const [closed, setClosed]           = useState(false);
  const [, startT]                    = useTransition();

  function finish() {
    startT(async () => {
      await saveWeeklyReview({
        weekStart, reflection, word,
        commitments: commitments.filter(c => c.trim()),
        stability: stability.score,
      });
      setClosed(true);
    });
  }

  if (closed) {
    return (
      <Card glow>
        <div className="text-center py-8">
          <div className="text-[40px] mb-3">✦</div>
          <div className="text-[18px] font-semibold tracking-tight">Semana cerrada.</div>
          <div className="mono text-[11px] mt-2" style={{ color: "var(--color-fg-3)" }}>
            Vuelve la próxima semana.
          </div>
          {word && (
            <div className="mono mt-4" style={{ fontSize: 13, color: "var(--color-accent)" }}>
              "{word.toUpperCase()}"
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-3">

      {/* ─ Progress bar ─────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 4 }}>
        {Array.from({ length: TOTAL }).map((_, i) => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 99,
            background: i <= step ? "var(--color-accent)" : "var(--color-bg-2)",
            boxShadow: i === step ? "0 0 8px var(--color-accent)" : "none",
          }} />
        ))}
      </div>

      {/* ─ Step 0: Estado de la semana ──────────────────────────── */}
      {step === 0 && (
        <Card glow>
          <div className="relative overflow-hidden" style={{ minHeight: 260 }}>
            <div className="absolute pointer-events-none"
              style={{ right: -50, top: -50, width: 220, height: 220, borderRadius: "50%",
                background: "radial-gradient(circle, oklch(.85 .18 150 / .25), transparent 70%)" }} />
            <div className="relative">
              <div className="micro">01 / 06 · ESTADO DE LA SEMANA</div>
              <div className="font-semibold tracking-tight leading-snug mt-3.5" style={{ fontSize: 24 }}>
                Stability cerró en{" "}
                <span style={{ color: "var(--color-accent)" }}>{stability.score}/100</span>.
              </div>
              <div className="mono mt-2.5" style={{ fontSize: 13, color: "var(--color-fg-3)" }}>
                {weekEventCount} eventos · {monthEventCount} en 30d
              </div>
              <div className="grid grid-cols-2 gap-2.5 mt-4">
                <BigMetric lbl="CAPITAL"    v={stability.pillars.capital}    accent />
                <BigMetric lbl="DISCIPLINA" v={stability.pillars.discipline}       />
                <BigMetric lbl="ANTI-FUGA"  v={stability.pillars.antifuga}         />
                <BigMetric lbl="EVENTOS"    v={weekEventCount}                      />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─ Step 1: Lo que funcionó ──────────────────────────────── */}
      {step === 1 && (
        <Card glow>
          <div style={{ minHeight: 260 }}>
            <div className="micro">02 / 06 · LO QUE FUNCIONÓ</div>
            <div className="flex flex-col gap-2.5 mt-3.5">
              {wins.length > 0 ? wins.map((w, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span style={{ width: 18, height: 18, borderRadius: 5, background: "var(--color-accent)", display: "grid", placeItems: "center", color: "#06120c", flexShrink: 0, marginTop: 2 }}>
                    <Icon name="check" size={11} stroke={2.6} />
                  </span>
                  <span style={{ fontSize: 13.5 }}>{w}</span>
                </div>
              )) : (
                <div style={{ fontSize: 13, color: "var(--color-fg-3)" }}>
                  Sin victorias detectadas. Empieza a registrar más esta semana.
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ─ Step 2: Lo que slipped ───────────────────────────────── */}
      {step === 2 && (
        <Card glow>
          <div style={{ minHeight: 260 }}>
            <div className="micro">03 / 06 · LO QUE SLIPPED</div>
            <div className="flex flex-col gap-2.5 mt-3.5">
              {misses.length > 0 ? misses.map((m, i) => (
                <div key={i} className="flex items-start gap-2.5">
                  <span style={{ width: 18, height: 18, borderRadius: 5, background: "transparent", border: "1px solid var(--color-warn)", display: "grid", placeItems: "center", color: "var(--color-warn)", flexShrink: 0, marginTop: 2 }}>
                    <span className="mono" style={{ fontSize: 11 }}>!</span>
                  </span>
                  <span style={{ fontSize: 13.5 }}>{m}</span>
                </div>
              )) : (
                <div style={{ fontSize: 13, color: "var(--color-accent)" }}>
                  Sin slips detectados. Semana limpia.
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ─ Step 3: El número ────────────────────────────────────── */}
      {step === 3 && (
        <Card glow>
          <div className="relative overflow-hidden" style={{ minHeight: 280 }}>
            <div className="absolute inset-0 pointer-events-none"
              style={{ background: "radial-gradient(circle at 50% 30%, oklch(.85 .18 150 / .18), transparent 60%)" }} />
            <div className="relative text-center py-6">
              <div className="micro">04 / 06 · EL NÚMERO</div>
              <div className="mono mt-3.5 leading-none"
                style={{ fontSize: 64, fontWeight: 300, color: "var(--color-accent)", letterSpacing: "-.03em" }}>
                {fmtCOP(protectedCents)}
              </div>
              <div className="mt-1.5" style={{ fontSize: 14, color: "var(--color-fg-2)" }}>
                protegidos esta semana
              </div>
              <div className="mono mt-4" style={{ fontSize: 11, color: "var(--color-fg-4)" }}>
                "Los pequeños sí cuentan. Especialmente cuando suman."
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* ─ Step 4: Reflexión ────────────────────────────────────── */}
      {step === 4 && (
        <Card glow>
          <div style={{ minHeight: 260 }}>
            <div className="micro">05 / 06 · REFLEXIÓN</div>
            <div className="mt-1.5" style={{ fontSize: 13, color: "var(--color-fg-3)" }}>
              ¿Cómo te sentiste esta semana? Una palabra basta.
            </div>
            <input
              style={inputStyle("center", 18)}
              placeholder="protección · disciplina · caos…"
              value={word}
              onChange={e => setWord(e.target.value)}
            />
            <textarea
              rows={4}
              style={{ ...inputStyle("left", 13), resize: "none" }}
              placeholder="Una frase honesta…"
              value={reflection}
              onChange={e => setReflection(e.target.value)}
            />
          </div>
        </Card>
      )}

      {/* ─ Step 5: Compromisos ──────────────────────────────────── */}
      {step === 5 && (
        <Card glow>
          <div style={{ minHeight: 260 }}>
            <div className="micro">06 / 06 · COMPROMISOS · SEM SIG.</div>
            <div className="flex flex-col gap-2 mt-3.5">
              {commitments.map((c, i) => (
                <div key={i} className="flex items-center gap-2.5">
                  <span className="mono shrink-0" style={{ fontSize: 11, color: "var(--color-fg-4)", width: 24 }}>
                    0{i + 1}
                  </span>
                  <input
                    style={{ ...inputStyle("left", 13), marginTop: 0, flex: 1 }}
                    placeholder={`Compromiso ${i + 1}`}
                    value={c}
                    onChange={e => {
                      const nx = [...commitments];
                      nx[i] = e.target.value;
                      setCommitments(nx);
                    }}
                  />
                </div>
              ))}
            </div>
          </div>
        </Card>
      )}

      {/* ─ Nav buttons ──────────────────────────────────────────── */}
      <div className="flex gap-2">
        {step > 0 && (
          <button style={btn(false, 1)} onClick={() => setStep(s => s - 1)}>
            ← Atrás
          </button>
        )}
        {step < TOTAL - 1 ? (
          <button style={btn(true, 2)} onClick={() => setStep(s => s + 1)}>
            Siguiente →
          </button>
        ) : (
          <button style={btn(true, 2)} onClick={finish}>
            <Icon name="check" size={14} /> Cerrar semana
          </button>
        )}
      </div>

      {/* ─ Past reviews (step 0 only) ───────────────────────────── */}
      {step === 0 && pastReviews.length > 0 && (
        <section>
          <div className="micro px-1 pt-1 pb-2.5">REVIEWS PASADAS</div>
          <div className="flex flex-col gap-2">
            {pastReviews.map(r => (
              <div key={r.id} className="rounded-card border p-3"
                style={{ background: "oklch(0.18 .007 250)", borderColor: "var(--color-hair)" }}>
                <div className="flex justify-between items-center">
                  <span className="mono text-[11px]">{r.week_start}</span>
                  {r.stability != null && <Pill kind="green">{r.stability}/100</Pill>}
                </div>
                {r.word && (
                  <div className="mt-1.5 font-semibold" style={{ fontSize: 14, color: "var(--color-accent)" }}>
                    {r.word.toUpperCase()}
                  </div>
                )}
                {r.reflection && (
                  <div className="mt-1" style={{ fontSize: 12.5, color: "var(--color-fg-2)", fontStyle: "italic" }}>
                    "{r.reflection}"
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

    </div>
  );
}
