"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDebt, updateDebt, closeDebt, reopenDebt, deleteDebt } from "@/app/actions/debts";

export type Debt = {
  id: string;
  name: string;
  source: string | null;
  total_cents: number;
  rate_annual: number | null;
  due_at: string | null;
  closed_at: string | null;
};

function fmtCOP(cents: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(cents / 100);
}

const s = {
  card: {
    background: "var(--color-bg-1)", border: "1px solid var(--color-hair)",
    borderRadius: 14, padding: "14px 16px",
  } as React.CSSProperties,
  input: {
    background: "var(--color-bg-0)", border: "1px solid var(--color-hair)",
    borderRadius: 9, padding: "9px 12px", fontSize: 14, color: "var(--color-fg)",
    width: "100%", boxSizing: "border-box" as const, outline: "none",
  } as React.CSSProperties,
  label: {
    display: "block", fontSize: 11, fontFamily: "monospace",
    color: "var(--color-fg-3)", marginBottom: 5, letterSpacing: ".06em",
  } as React.CSSProperties,
  btnPrimary: {
    flex: 1, padding: "11px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
    cursor: "pointer", background: "var(--color-accent)", border: "none",
    color: "var(--color-bg-0)",
  } as React.CSSProperties,
  btnSecondary: {
    padding: "11px 18px", borderRadius: 10, fontSize: 13.5, cursor: "pointer",
    background: "transparent", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)",
  } as React.CSSProperties,
};

// ── Edit form inside a row ────────────────────────────────────────
function EditForm({ d, onSave, onCancel }: { d: Debt; onSave: () => void; onCancel: () => void }) {
  const [pending, start] = useTransition();
  const [name, setName]       = useState(d.name);
  const [source, setSource]   = useState(d.source ?? "");
  const [totalCOP, setTotal]  = useState(String(Math.round(d.total_cents / 100)));
  const [rate, setRate]       = useState(String(d.rate_annual ?? 0));
  const [dueAt, setDueAt]     = useState(d.due_at ?? "");

  function save() {
    const cents = Number(totalCOP.replace(/[^0-9]/g, "")) * 100;
    if (!name.trim() || cents <= 0) return;
    start(async () => {
      await updateDebt(d.id, {
        name: name.trim(),
        source: source.trim() || undefined,
        total_cents: cents,
        rate_annual: Number(rate) || 0,
        due_at: dueAt || null,
      });
      onSave();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <div>
          <label style={s.label}>NOMBRE</label>
          <input style={s.input} value={name} onChange={e => setName(e.target.value)} />
        </div>
        <div>
          <label style={s.label}>FUENTE</label>
          <input style={s.input} value={source} onChange={e => setSource(e.target.value)} placeholder="ej. Rapicredit" />
        </div>
        <div>
          <label style={s.label}>SALDO ACTUAL ($COP)</label>
          <input style={s.input} type="number" value={totalCOP} onChange={e => setTotal(e.target.value)} min={0} />
        </div>
        <div>
          <label style={s.label}>TASA ANUAL (%)</label>
          <input style={s.input} type="number" value={rate} onChange={e => setRate(e.target.value)} min={0} step={0.1} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={s.label}>FECHA LÍMITE</label>
          <input style={s.input} type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={save} disabled={pending}
          style={{ ...s.btnPrimary, opacity: pending ? .5 : 1 }}>
          {pending ? "Guardando…" : "Guardar"}
        </button>
        <button type="button" onClick={onCancel} style={s.btnSecondary}>Cancelar</button>
      </div>
    </div>
  );
}

// ── Single debt row ───────────────────────────────────────────────
function DebtRow({ d, onRefresh }: { d: Debt; onRefresh: () => void }) {
  const [mode, setMode]   = useState<"view" | "edit" | "confirm">("view");
  const [pending, start]  = useTransition();
  const isClosed = !!d.closed_at;

  function toggle() {
    start(async () => {
      if (isClosed) await reopenDebt(d.id);
      else await closeDebt(d.id);
      onRefresh();
    });
  }

  function remove() {
    start(async () => {
      await deleteDebt(d.id);
      onRefresh();
    });
  }

  const days = d.due_at
    ? Math.floor((new Date(d.due_at).getTime() - Date.now()) / 86_400_000)
    : null;

  return (
    <div style={{
      ...s.card,
      borderColor: mode === "edit" ? "var(--color-accent)" : "var(--color-hair)",
      opacity: isClosed ? .6 : 1,
    }}>
      {mode === "edit" ? (
        <EditForm d={d} onSave={() => { setMode("view"); onRefresh(); }} onCancel={() => setMode("view")} />
      ) : (
        <>
          {/* header row */}
          <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 600 }}>{d.name}</span>
                {d.source && <span style={{ fontSize: 11.5, color: "var(--color-fg-4)" }}>{d.source}</span>}
                {isClosed && (
                  <span style={{
                    fontSize: 10, fontFamily: "monospace", fontWeight: 600, letterSpacing: ".06em",
                    background: "oklch(.65 .12 150 / .15)", color: "oklch(.65 .12 150)",
                    borderRadius: 99, padding: "2px 8px",
                  }}>PAGADA</span>
                )}
              </div>

              <div style={{ display: "flex", gap: 14, marginTop: 7, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 18, fontWeight: 700, color: "var(--color-danger)", fontFamily: "var(--font-mono)" }}>
                  {fmtCOP(d.total_cents)}
                </span>
                {(d.rate_annual ?? 0) > 0 && (
                  <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--color-fg-4)" }}>
                    {d.rate_annual}% EA
                  </span>
                )}
                {days !== null && (
                  <span style={{
                    fontSize: 11, fontFamily: "monospace",
                    color: days < 7 ? "var(--color-danger)" : days < 30 ? "var(--color-warn)" : "var(--color-fg-4)",
                  }}>
                    {days < 0 ? "¡Vencida!" : days === 0 ? "Vence hoy" : `Vence en ${days}d`}
                  </span>
                )}
              </div>
            </div>

            {/* action buttons */}
            <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
              <button type="button" onClick={() => setMode("edit")}
                style={{
                  padding: "7px 12px", borderRadius: 9, fontSize: 12.5, fontWeight: 500,
                  cursor: "pointer", background: "var(--color-bg-2)",
                  border: "1px solid var(--color-hair)", color: "var(--color-fg-2)",
                }}>
                ✏ Editar
              </button>
              <button type="button" onClick={toggle} disabled={pending}
                style={{
                  padding: "7px 12px", borderRadius: 9, fontSize: 12.5, fontWeight: 500,
                  cursor: "pointer",
                  background: isClosed ? "oklch(.65 .12 150 / .12)" : "oklch(.65 .18 25 / .1)",
                  border: `1px solid ${isClosed ? "oklch(.65 .12 150 / .3)" : "oklch(.65 .18 25 / .3)"}`,
                  color: isClosed ? "oklch(.7 .12 150)" : "oklch(.7 .18 25)",
                }}>
                {isClosed ? "Reabrir" : "Pagar"}
              </button>
            </div>
          </div>

          {/* delete */}
          {mode === "confirm" ? (
            <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center" }}>
              <span style={{ fontSize: 13, color: "var(--color-fg-3)" }}>¿Eliminar permanentemente?</span>
              <button type="button" onClick={remove} disabled={pending}
                style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer",
                  background: "oklch(.6 .18 25 / .15)", border: "1px solid oklch(.6 .18 25 / .4)",
                  color: "oklch(.7 .15 25)", fontWeight: 600,
                }}>
                Sí, eliminar
              </button>
              <button type="button" onClick={() => setMode("view")}
                style={{
                  padding: "5px 14px", borderRadius: 8, fontSize: 12.5, cursor: "pointer",
                  background: "transparent", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)",
                }}>
                Cancelar
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => setMode("confirm")}
              style={{
                marginTop: 10, padding: 0, background: "transparent", border: "none",
                fontSize: 11.5, color: "var(--color-fg-4)", cursor: "pointer", textDecoration: "underline",
              }}>
              Eliminar deuda
            </button>
          )}
        </>
      )}
    </div>
  );
}

// ── Add form ──────────────────────────────────────────────────────
function AddForm({ onDone }: { onDone: () => void }) {
  const [open, setOpen]       = useState(false);
  const [pending, start]      = useTransition();
  const [name, setName]       = useState("");
  const [source, setSource]   = useState("");
  const [totalCOP, setTotal]  = useState("");
  const [rate, setRate]       = useState("");
  const [dueAt, setDueAt]     = useState("");

  function submit() {
    const cents = Number(totalCOP.replace(/[^0-9]/g, "")) * 100;
    if (!name.trim() || cents <= 0) return;
    start(async () => {
      await addDebt({
        name: name.trim(),
        source: source.trim() || undefined,
        total_cents: cents,
        rate_annual: Number(rate) || 0,
        due_at: dueAt || undefined,
      });
      setName(""); setSource(""); setTotal(""); setRate(""); setDueAt("");
      setOpen(false);
      onDone();
    });
  }

  if (!open) return (
    <button type="button" onClick={() => setOpen(true)}
      style={{
        width: "100%", padding: "13px 0", borderRadius: 12, fontSize: 14, fontWeight: 600,
        background: "oklch(.65 .18 150 / .08)", border: "2px dashed oklch(.65 .18 150 / .35)",
        color: "var(--color-accent)", cursor: "pointer",
      }}>
      + Agregar deuda
    </button>
  );

  return (
    <div style={{ ...s.card, borderColor: "var(--color-accent)" }}>
      <div style={{ fontSize: 12, fontFamily: "monospace", letterSpacing: ".08em", color: "var(--color-fg-3)", marginBottom: 14 }}>
        NUEVA DEUDA
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={s.label}>NOMBRE *</label>
            <input style={s.input} value={name} onChange={e => setName(e.target.value)} placeholder="ej. Rapicredit" />
          </div>
          <div>
            <label style={s.label}>FUENTE</label>
            <input style={s.input} value={source} onChange={e => setSource(e.target.value)} placeholder="ej. banco, app" />
          </div>
          <div>
            <label style={s.label}>SALDO ($COP) *</label>
            <input style={s.input} type="number" value={totalCOP} onChange={e => setTotal(e.target.value)} placeholder="380000" min={0} />
          </div>
          <div>
            <label style={s.label}>TASA ANUAL (%)</label>
            <input style={s.input} type="number" value={rate} onChange={e => setRate(e.target.value)} placeholder="26" min={0} step={0.1} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={s.label}>FECHA LÍMITE</label>
            <input style={s.input} type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={submit} disabled={pending || !name.trim() || !totalCOP}
            style={{ ...s.btnPrimary, opacity: pending || !name.trim() || !totalCOP ? .45 : 1 }}>
            {pending ? "Guardando…" : "Agregar deuda"}
          </button>
          <button type="button" onClick={() => setOpen(false)} style={s.btnSecondary}>Cancelar</button>
        </div>
      </div>
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────
export function DebtsManager({ initialDebts }: { initialDebts: Debt[] }) {
  const router = useRouter();
  const [, start] = useTransition();

  // Don't use useState — server component owns the source of truth.
  // router.refresh() re-runs the server component and passes fresh initialDebts.
  function refresh() {
    start(() => { router.refresh(); });
  }

  const active = initialDebts.filter(d => !d.closed_at);
  const closed = initialDebts.filter(d => !!d.closed_at);
  const totalActive = active.reduce((s, d) => s + d.total_cents, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* total banner */}
      {active.length > 0 && (
        <div style={{
          background: "oklch(.6 .18 25 / .06)", border: "1px solid oklch(.6 .18 25 / .18)",
          borderRadius: 12, padding: "12px 16px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--color-fg-3)", letterSpacing: ".08em" }}>
            TOTAL DEUDA ACTIVA
          </span>
          <span style={{ fontSize: 20, fontWeight: 700, color: "var(--color-danger)", fontFamily: "var(--font-mono)" }}>
            {fmtCOP(totalActive)}
          </span>
        </div>
      )}

      {/* active debts */}
      {active.length === 0 && closed.length === 0 && (
        <div style={{ textAlign: "center", padding: "24px 0", color: "var(--color-fg-3)", fontSize: 13.5 }}>
          No tienes deudas registradas. Agrega una abajo.
        </div>
      )}

      {active.map(d => <DebtRow key={d.id} d={d} onRefresh={refresh} />)}

      {/* add form */}
      <AddForm onDone={refresh} />

      {/* closed debts */}
      {closed.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{
            fontSize: 12.5, color: "var(--color-fg-4)", cursor: "pointer",
            userSelect: "none", listStyle: "none", padding: "8px 0",
          }}>
            ▸ Deudas pagadas ({closed.length})
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
            {closed.map(d => <DebtRow key={d.id} d={d} onRefresh={refresh} />)}
          </div>
        </details>
      )}
    </div>
  );
}
