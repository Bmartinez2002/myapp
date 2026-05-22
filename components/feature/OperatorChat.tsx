"use client";
import { useState, useRef, useEffect } from "react";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { saveBriefing } from "@/app/actions/operator";

export type OperatorCtx = {
  stability:      number;
  pillars:        { capital: number; discipline: number; antifuga: number };
  todaySpendCop:  number;
  dailyLimitCop:  number;
  impulses30d:    number;
  habits:         Array<{ name: string; streak: number }>;
  savedSoFarCop:  number;
  metaTargetCop:  number;
  nextDebt:       { name: string; due: string | null; remainingCop: number } | null;
  totalEvents:    number;
};

export type InitialMsg = {
  id:      string;
  kind:    "ai";
  content: string;
  ts:      string;
};

type Msg = { id: string; kind: "user" | "ai"; content: string; ts: string };

type Props = {
  initialMsgs: InitialMsg[];
  ctx:         OperatorCtx;
};

function buildBriefingPrompt(ctx: OperatorCtx): string {
  return `Eres el BRAYAN OS Operator. Genera un briefing matutino en español de Colombia.
Datos: ${JSON.stringify(ctx)}
Reglas: ≤100 palabras, directo, sin emojis, sin "¡bien hecho!". 1 frase de estado, 1-2 acciones concretas con números, 1 riesgo si aplica. Si total_events es 0, dile que registre su primer movimiento. Nunca inventes números.
Responde directo, sin preámbulo.`;
}

function buildAskPrompt(ctx: OperatorCtx, q: string): string {
  const brief = {
    stability: ctx.stability,
    pillars:   ctx.pillars,
    saved_so_far_cop: ctx.savedSoFarCop,
    meta_target_cop:  ctx.metaTargetCop,
    events_total:     ctx.totalEvents,
    debts: ctx.nextDebt ? [ctx.nextDebt] : [],
  };
  return `Eres BRAYAN OS Operator. Responde en es-CO, ≤80 palabras, directo, sin emojis.
Contexto: ${JSON.stringify(brief)}
Pregunta: ${q}
Responde con números concretos solo si están en el contexto. Si no, sé honesto.`;
}

export function OperatorChat({ initialMsgs, ctx }: Props) {
  const [msgs,  setMsgs]  = useState<Msg[]>(initialMsgs);
  const [input, setInput] = useState("");
  const [busy,  setBusy]  = useState(false);
  const bottomRef         = useRef<HTMLDivElement>(null);
  const inputRef          = useRef<HTMLInputElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  async function streamOperator(prompt: string, kind: "daily" | "insight") {
    setBusy(true);
    const streamId = "stream-" + Date.now();
    setMsgs(m => [...m, { id: streamId, kind: "ai", content: "", ts: new Date().toISOString() }]);

    try {
      const resp = await fetch("/api/operator", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body:    JSON.stringify({ prompt }),
      });

      if (!resp.ok) throw new Error(await resp.text());

      const reader  = resp.body!.getReader();
      const decoder = new TextDecoder();
      let full      = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value);
        setMsgs(m => m.map(msg => msg.id === streamId ? { ...msg, content: full } : msg));
      }

      // Persist to DB without blocking UI
      saveBriefing({ content: full, kind }).catch(() => null);
      setMsgs(m => m.map(msg =>
        msg.id === streamId ? { ...msg, id: "saved-" + Date.now() } : msg,
      ));
    } catch {
      setMsgs(m => m.map(msg =>
        msg.id === streamId
          ? { ...msg, content: "No pude conectar con el operador. Verifica ANTHROPIC_API_KEY y reintenta." }
          : msg,
      ));
    }

    setBusy(false);
  }

  function generateBriefing() {
    streamOperator(buildBriefingPrompt(ctx), "daily");
  }

  function ask() {
    const q = input.trim();
    if (!q || busy) return;
    setInput("");
    setMsgs(m => [...m, { id: "u-" + Date.now(), kind: "user", content: q, ts: new Date().toISOString() }]);
    streamOperator(buildAskPrompt(ctx, q), "insight");
  }

  return (
    <>
      {/* ─ Refresh briefing button (header bar) ──────────────── */}
      <div className="flex items-center justify-between px-1 pb-1">
        <span className="mono text-[10.5px]" style={{ color: "var(--color-fg-4)" }}>
          {msgs.length} mensaje{msgs.length !== 1 ? "s" : ""}
        </span>
        <button
          onClick={generateBriefing}
          disabled={busy}
          title="Generar briefing"
          style={{
            display: "flex", alignItems: "center", gap: 6, padding: "6px 12px",
            borderRadius: 10, cursor: busy ? "not-allowed" : "pointer",
            background: "oklch(.85 .18 150 / .13)",
            border: "1px solid oklch(.85 .18 150 / .3)",
            color: "var(--color-accent)",
            opacity: busy ? 0.5 : 1,
          }}
        >
          <Icon name="refresh" size={13} />
          <span className="mono text-[10.5px]">BRIEFING</span>
        </button>
      </div>

      {/* ─ Messages ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-2.5 pb-32">

        {/* Empty state */}
        {msgs.length === 0 && (
          <div className="rounded-card border p-4"
            style={{
              background: "linear-gradient(180deg, oklch(0.19 .007 250) 0%, oklch(0.16 .006 250) 100%)",
              borderColor: "oklch(.85 .18 150 / .3)",
              boxShadow: "0 0 0 1px oklch(.85 .18 150 / .12), 0 24px 60px -30px oklch(.85 .18 150 / .35)",
            }}>
            <div className="flex items-center gap-2.5 mb-3">
              <div style={{
                width: 32, height: 32, borderRadius: 9, display: "grid", placeItems: "center",
                background: "linear-gradient(135deg, var(--color-accent), var(--color-accent-2))",
                color: "#06120c", flexShrink: 0,
              }}>
                <Icon name="ai" size={16} stroke={2} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>Operator IA</div>
                <div className="mono text-[10px]" style={{ color: "var(--color-fg-4)" }}>LISTO</div>
              </div>
            </div>
            <div style={{ fontSize: 14, lineHeight: 1.55 }}>
              Toca <b>BRIEFING</b> para tu primer análisis del día. O escribe abajo lo que quieres saber.
            </div>
          </div>
        )}

        {msgs.map(m => (
          <div
            key={m.id}
            style={{
              alignSelf:    m.kind === "user" ? "flex-end" : "flex-start",
              maxWidth:     "85%",
              padding:      "10px 14px",
              borderRadius: m.kind === "user" ? "18px 18px 4px 18px" : "4px 18px 18px 18px",
              background:   m.kind === "user"
                ? "oklch(.85 .18 150 / .18)"
                : "oklch(0.19 .007 250)",
              border: `1px solid ${m.kind === "user" ? "oklch(.85 .18 150 / .35)" : "var(--color-hair)"}`,
              fontSize: 14,
              lineHeight: 1.5,
              whiteSpace: "pre-wrap",
            }}
          >
            {m.content === "" && m.kind === "ai" ? (
              <span className="mono text-[12px]" style={{ color: "var(--color-fg-3)" }}>
                <Icon name="ai" size={13} style={{ display: "inline", verticalAlign: "middle", marginRight: 4 }} />
                pensando…
              </span>
            ) : m.content}
            <div className="mono mt-1" style={{ fontSize: 9.5, color: "var(--color-fg-4)", textAlign: m.kind === "user" ? "right" : "left" }}>
              {new Date(m.ts).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}
            </div>
          </div>
        ))}

        <div ref={bottomRef} />
      </div>

      {/* ─ Fixed input bar ───────────────────────────────────── */}
      <div style={{
        position: "fixed", left: 12, right: 12,
        bottom: "calc(72px + env(safe-area-inset-bottom, 0px))",
        zIndex: 30, display: "flex", gap: 8,
        background: "oklch(0.16 .006 250 / .94)",
        backdropFilter: "blur(16px)",
        border: "1px solid var(--color-hair)",
        borderRadius: 18, padding: 8,
        boxShadow: "0 12px 30px -10px oklch(0 0 0 / .6)",
      }}>
        <input
          ref={inputRef}
          style={{
            flex: 1, background: "transparent", border: "none", outline: "none",
            fontSize: 13, color: "var(--color-fg)", padding: "10px 8px",
            fontFamily: "inherit",
          }}
          placeholder="Pregúntale al operator…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { ask(); e.preventDefault(); } }}
          disabled={busy}
        />
        <button
          onClick={ask}
          disabled={busy || !input.trim()}
          style={{
            padding: "8px 14px", borderRadius: 12, border: "none",
            background: busy || !input.trim() ? "var(--color-bg-2)" : "var(--color-accent)",
            color:      busy || !input.trim() ? "var(--color-fg-4)" : "#06120c",
            cursor:     busy || !input.trim() ? "not-allowed" : "pointer",
            display:    "flex", alignItems: "center", flexShrink: 0,
          }}
        >
          <Icon name="arrow" size={14} stroke={2.4} />
        </button>
      </div>
    </>
  );
}
