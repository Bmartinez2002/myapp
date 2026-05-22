"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDebt, updateDebt, closeDebt, reopenDebt, deleteDebt } from "@/app/actions/debts";

type Debt = {
  id: string;
  name: string;
  source: string | null;
  total_cents: number;
  rate_annual: number | null;
  due_at: string | null;
  closed_at: string | null;
};

function fmtCOP(cents: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 })
    .format(cents / 100);
}

function copToCents(val: string) {
  const n = Number(val.replace(/[^0-9]/g, ""));
  return isNaN(n) ? 0 : n * 100;
}

const pill: React.CSSProperties = {
  display: "inline-block", padding: "2px 8px", borderRadius: 99, fontSize: 11,
  fontWeight: 600, fontFamily: "monospace",
};

function DebtRow({ d, onDone }: { d: Debt; onDone: () => void }) {
  const [editing, setEditing] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName]           = useState(d.name);
  const [source, setSource]       = useState(d.source ?? "");
  const [totalCOP, setTotalCOP]   = useState(String(Math.round(d.total_cents / 100)));
  const [rate, setRate]           = useState(String(d.rate_annual ?? 0));
  const [dueAt, setDueAt]         = useState(d.due_at ?? "");
  const [confirm, setConfirm]     = useState(false);

  const isClosed = !!d.closed_at;

  function save() {
    start(async () => {
      await updateDebt(d.id, {
        name,
        source: source || undefined,
        total_cents: copToCents(totalCOP),
        rate_annual: Number(rate) || 0,
        due_at: dueAt || null,
      });
      setEditing(false);
      onDone();
    });
  }

  function toggle() {
    start(async () => {
      if (isClosed) await reopenDebt(d.id);
      else await closeDebt(d.id);
      onDone();
    });
  }

  function remove() {
    start(async () => {
      await deleteDebt(d.id);
      onDone();
    });
  }

  const inputStyle: React.CSSProperties = {
    background: "var(--color-bg-1)", border: "1px solid var(--color-hair)",
    borderRadius: 8, padding: "7px 10px", fontSize: 13, color: "var(--color-fg)",
    width: "100%", boxSizing: "border-box",
  };

  if (editing) {
    return (
      <div style={{
        background: "var(--color-bg-1)", border: "1px solid var(--color-accent)",
        borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>NOMBRE</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>FUENTE</label>
            <input style={inputStyle} value={source} onChange={e => setSource(e.target.value)} placeholder="ej. Rapicredit" />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>SALDO ($COP)</label>
            <input
              style={inputStyle}
              type="number"
              value={totalCOP}
              onChange={e => setTotalCOP(e.target.value)}
              min={0}
            />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>TASA ANUAL (%)</label>
            <input style={inputStyle} type="number" value={rate} onChange={e => setRate(e.target.value)} min={0} max={200} step={0.1} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>FECHA LÍMITE</label>
            <input style={inputStyle} type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button" onClick={save} disabled={pending}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "var(--color-accent)", border: "none", color: "var(--color-bg-0)",
              opacity: pending ? 0.6 : 1,
            }}
          >
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button
            type="button" onClick={() => setEditing(false)} disabled={pending}
            style={{
              padding: "9px 16px", borderRadius: 9, fontSize: 13, cursor: "pointer",
              background: "transparent", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)",
            }}
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      background: "var(--color-bg-1)", border: "1px solid var(--color-hair)",
      borderRadius: 12, padding: "12px 14px",
      opacity: isClosed ? 0.55 : 1,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13.5, fontWeight: 600 }}>{d.name}</span>
            {d.source && (
              <span style={{ fontSize: 11, color: "var(--color-fg-4)" }}>{d.source}</span>
            )}
            {isClosed && (
              <span style={{ ...pill, background: "oklch(.65 .12 150 / .15)", color: "oklch(.65 .12 150)" }}>
                PAGADA
              </span>
            )}
          </div>
          <div style={{ display: "flex", gap: 16, marginTop: 6, flexWrap: "wrap" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--color-danger)" }}>
              {fmtCOP(d.total_cents)}
            </span>
            {(d.rate_annual ?? 0) > 0 && (
              <span className="mono" style={{ fontSize: 11, color: "var(--color-fg-3)" }}>
                {d.rate_annual}% EA
              </span>
            )}
            {d.due_at && (
              <span className="mono" style={{ fontSize: 11, color: "var(--color-warn)" }}>
                vence {d.due_at}
              </span>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
          <button
            type="button" onClick={() => setEditing(true)}
            style={{
              padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: "transparent", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)",
            }}
          >
            Editar
          </button>
          <button
            type="button" onClick={toggle} disabled={pending}
            style={{
              padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: isClosed
                ? "oklch(.65 .12 150 / .12)"
                : "oklch(.65 .18 150 / .12)",
              border: isClosed
                ? "1px solid oklch(.65 .12 150 / .35)"
                : "1px solid oklch(.65 .18 150 / .35)",
              color: isClosed ? "oklch(.7 .12 150)" : "oklch(.7 .18 150)",
            }}
          >
            {isClosed ? "Reabrir" : "Cerrar"}
          </button>
        </div>
      </div>

      {confirm && (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--color-fg-3)" }}>¿Eliminar permanentemente?</span>
          <button type="button" onClick={remove} disabled={pending}
            style={{
              padding: "5px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: "oklch(.6 .18 25 / .12)", border: "1px solid oklch(.6 .18 25 / .35)",
              color: "oklch(.7 .15 25)",
            }}
          >
            Sí, eliminar
          </button>
          <button type="button" onClick={() => setConfirm(false)}
            style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: "transparent", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)" }}
          >
            No
          </button>
        </div>
      )}
      {!confirm && (
        <button type="button" onClick={() => setConfirm(true)}
          style={{
            marginTop: 8, padding: 0, background: "transparent", border: "none",
            fontSize: 11, color: "var(--color-fg-4)", cursor: "pointer", textDecoration: "underline",
          }}
        >
          Eliminar
        </button>
      )}
    </div>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName]         = useState("");
  const [source, setSource]     = useState("");
  const [totalCOP, setTotalCOP] = useState("");
  const [rate, setRate]         = useState("0");
  const [dueAt, setDueAt]       = useState("");

  const inputStyle: React.CSSProperties = {
    background: "var(--color-bg-0)", border: "1px solid var(--color-hair)",
    borderRadius: 8, padding: "7px 10px", fontSize: 13, color: "var(--color-fg)",
    width: "100%", boxSizing: "border-box",
  };

  function submit() {
    if (!name.trim() || !totalCOP) return;
    start(async () => {
      await addDebt({
        name,
        source: source || undefined,
        total_cents: copToCents(totalCOP),
        rate_annual: Number(rate) || 0,
        due_at: dueAt || undefined,
      });
      setName(""); setSource(""); setTotalCOP(""); setRate("0"); setDueAt("");
      setOpen(false);
      onDone();
    });
  }

  if (!open) {
    return (
      <button
        type="button" onClick={() => setOpen(true)}
        style={{
          width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
          background: "oklch(.65 .18 150 / .1)", border: "1px dashed oklch(.65 .18 150 / .4)",
          color: "var(--color-accent)", cursor: "pointer",
        }}
      >
        + Agregar deuda
      </button>
    );
  }

  return (
    <div style={{
      background: "var(--color-bg-1)", border: "1px solid var(--color-accent)",
      borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".1em", color: "var(--color-fg-3)" }}>
        NUEVA DEUDA
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>NOMBRE *</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="ej. Universidad" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>FUENTE</label>
          <input style={inputStyle} value={source} onChange={e => setSource(e.target.value)} placeholder="ej. Banco" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>SALDO ($COP) *</label>
          <input
            style={inputStyle} type="number" value={totalCOP}
            onChange={e => setTotalCOP(e.target.value)} placeholder="380000" min={0}
          />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>TASA ANUAL (%)</label>
          <input style={inputStyle} type="number" value={rate} onChange={e => setRate(e.target.value)} min={0} max={200} step={0.1} />
        </div>
        <div style={{ gridColumn: "1/-1" }}>
          <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>FECHA LÍMITE</label>
          <input style={inputStyle} type="date" value={dueAt} onChange={e => setDueAt(e.target.value)} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          type="button" onClick={submit} disabled={pending || !name.trim() || !totalCOP}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 600,
            cursor: "pointer", background: "var(--color-accent)", border: "none", color: "var(--color-bg-0)",
            opacity: pending || !name.trim() || !totalCOP ? 0.5 : 1,
          }}
        >
          {pending ? "Guardando…" : "Agregar"}
        </button>
        <button
          type="button" onClick={() => setOpen(false)}
          style={{
            padding: "9px 16px", borderRadius: 9, fontSize: 13, cursor: "pointer",
            background: "transparent", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)",
          }}
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function DebtsManager({ initialDebts }: { initialDebts: Debt[] }) {
  const [debts, setDebts] = useState(initialDebts);
  const router = useRouter();
  const [, start] = useTransition();

  function refresh() {
    start(() => { router.refresh(); });
  }

  const active = debts.filter(d => !d.closed_at);
  const closed = debts.filter(d => !!d.closed_at);

  const totalActive = active.reduce((s, d) => s + d.total_cents, 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {active.length > 0 && (
        <div style={{
          background: "oklch(.6 .18 25 / .08)", border: "1px solid oklch(.6 .18 25 / .2)",
          borderRadius: 12, padding: "12px 14px",
          display: "flex", justifyContent: "space-between", alignItems: "center",
        }}>
          <span className="mono" style={{ fontSize: 11, color: "var(--color-fg-3)", letterSpacing: ".08em" }}>
            TOTAL DEUDA ACTIVA
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: "var(--color-danger)" }}>
            {fmtCOP(totalActive)}
          </span>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {active.map(d => (
          <DebtRow key={d.id} d={d} onDone={refresh} />
        ))}
      </div>

      <AddForm onDone={refresh} />

      {closed.length > 0 && (
        <details style={{ marginTop: 4 }}>
          <summary style={{ fontSize: 12, color: "var(--color-fg-4)", cursor: "pointer", userSelect: "none" }}>
            Deudas cerradas ({closed.length})
          </summary>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 10 }}>
            {closed.map(d => (
              <DebtRow key={d.id} d={d} onDone={refresh} />
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
