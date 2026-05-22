"use client";
import { useState, useTransition } from "react";
import { addCategory, updateCategory, deleteCategory } from "@/app/actions/categories";

type Category = {
  id: string;
  name: string;
  emoji: string | null;
  kind: string;
  risk_tier: string | null;
};

const KIND_LABEL: Record<string, string> = {
  expense: "GASTO", income: "INGRESO", transfer: "TRANSFERENCIA",
};
const RISK_COLOR: Record<string, string> = {
  safe:   "oklch(0.85 0.18 150 / .15)",
  watch:  "oklch(0.82 0.16 80 / .15)",
  danger: "oklch(0.7 0.2 25 / .15)",
};
const RISK_BORDER: Record<string, string> = {
  safe:   "oklch(0.85 0.18 150 / .4)",
  watch:  "oklch(0.82 0.16 80 / .4)",
  danger: "oklch(0.7 0.2 25 / .4)",
};
const RISK_TEXT: Record<string, string> = {
  safe: "oklch(0.85 0.18 150)", watch: "oklch(0.82 0.16 80)", danger: "oklch(0.7 0.2 25)",
};

const inputStyle: React.CSSProperties = {
  padding: "8px 10px", borderRadius: 8, fontSize: 13,
  background: "var(--color-bg-1)", border: "1px solid var(--color-hair)",
  color: "var(--color-fg)", outline: "none",
};
const selectStyle: React.CSSProperties = { ...inputStyle };

function AddForm({ onDone }: { onDone: () => void }) {
  const [name,     setName]     = useState("");
  const [emoji,    setEmoji]    = useState("");
  const [kind,     setKind]     = useState<"expense" | "income" | "transfer">("expense");
  const [risk,     setRisk]     = useState<"safe" | "watch" | "danger">("safe");
  const [pending,  start]       = useTransition();

  function submit() {
    if (!name.trim()) return;
    start(async () => {
      await addCategory({ name: name.trim(), emoji: emoji || undefined, kind, risk_tier: risk });
      onDone();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, padding: "12px 0 4px" }}>
      <div style={{ display: "flex", gap: 8 }}>
        <input value={emoji} onChange={e => setEmoji(e.target.value)} placeholder="🏷" style={{ ...inputStyle, width: 48, textAlign: "center" }} maxLength={2} />
        <input value={name} onChange={e => setName(e.target.value)} placeholder="Nombre" style={{ ...inputStyle, flex: 1 }} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <select value={kind} onChange={e => setKind(e.target.value as "expense" | "income" | "transfer")} style={{ ...selectStyle, flex: 1 }}>
          <option value="expense">Gasto</option>
          <option value="income">Ingreso</option>
          <option value="transfer">Transferencia</option>
        </select>
        <select value={risk} onChange={e => setRisk(e.target.value as "safe" | "watch" | "danger")} style={{ ...selectStyle, flex: 1 }}>
          <option value="safe">Seguro</option>
          <option value="watch">Vigilar</option>
          <option value="danger">Peligro</option>
        </select>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={submit} disabled={pending || !name.trim()} style={{
          flex: 1, padding: "9px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
          background: "var(--color-accent)", color: "var(--color-bg-0)", border: "none",
          opacity: pending || !name.trim() ? 0.5 : 1,
        }}>
          {pending ? "Guardando…" : "Agregar"}
        </button>
        <button onClick={onDone} style={{
          padding: "9px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
          background: "var(--color-bg-2)", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)",
        }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function CatRow({ cat }: { cat: Category }) {
  const [editing,  setEditing]  = useState(false);
  const [name,     setName]     = useState(cat.name);
  const [emoji,    setEmoji]    = useState(cat.emoji ?? "");
  const [risk,     setRisk]     = useState<"safe" | "watch" | "danger">((cat.risk_tier as "safe" | "watch" | "danger") ?? "safe");
  const [pending,  start]       = useTransition();
  const tier = cat.risk_tier ?? "safe";

  function save() {
    start(async () => {
      await updateCategory(cat.id, { name: name.trim(), emoji: emoji || undefined, risk_tier: risk });
      setEditing(false);
    });
  }
  function remove() {
    if (!confirm(`¿Eliminar "${cat.name}"?`)) return;
    start(async () => { await deleteCategory(cat.id); });
  }

  return (
    <div style={{
      padding: "10px 12px", borderRadius: 10,
      background: RISK_COLOR[tier] ?? "var(--color-bg-1)",
      border: `1px solid ${RISK_BORDER[tier] ?? "var(--color-hair)"}`,
    }}>
      {!editing ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18, width: 24, textAlign: "center" }}>{cat.emoji ?? "🏷"}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13.5, fontWeight: 500 }}>{cat.name}</div>
            <div className="mono" style={{ fontSize: 10, color: "var(--color-fg-4)", marginTop: 1 }}>
              {KIND_LABEL[cat.kind] ?? cat.kind} · <span style={{ color: RISK_TEXT[tier] }}>{risk.toUpperCase()}</span>
            </div>
          </div>
          <button onClick={() => setEditing(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "var(--color-fg-3)", fontSize: 12 }}>Editar</button>
          <button onClick={remove} disabled={pending} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, color: "oklch(0.7 0.2 25)", fontSize: 12 }}>✕</button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", gap: 8 }}>
            <input value={emoji} onChange={e => setEmoji(e.target.value)} style={{ ...inputStyle, width: 48, textAlign: "center" }} maxLength={2} />
            <input value={name} onChange={e => setName(e.target.value)} style={{ ...inputStyle, flex: 1 }} />
          </div>
          <select value={risk} onChange={e => setRisk(e.target.value as "safe" | "watch" | "danger")} style={selectStyle}>
            <option value="safe">Seguro</option>
            <option value="watch">Vigilar</option>
            <option value="danger">Peligro</option>
          </select>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={save} disabled={pending} style={{
              flex: 1, padding: "8px 0", borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: "pointer",
              background: "var(--color-accent)", color: "var(--color-bg-0)", border: "none",
              opacity: pending ? 0.5 : 1,
            }}>
              {pending ? "…" : "Guardar"}
            </button>
            <button onClick={() => setEditing(false)} style={{ padding: "8px 12px", borderRadius: 8, fontSize: 13, cursor: "pointer", background: "var(--color-bg-2)", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)" }}>Cancelar</button>
          </div>
        </div>
      )}
    </div>
  );
}

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const [adding, setAdding] = useState(false);
  const groups = {
    expense:  categories.filter(c => c.kind === "expense"),
    income:   categories.filter(c => c.kind === "income"),
    transfer: categories.filter(c => c.kind === "transfer"),
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {(["expense", "income", "transfer"] as const).map(kind => {
        const cats = groups[kind];
        if (kind !== "expense" && cats.length === 0) return null;
        return (
          <div key={kind}>
            <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".12em", color: "var(--color-fg-3)", marginBottom: 8 }}>
              {KIND_LABEL[kind]}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {cats.map(c => <CatRow key={c.id} cat={c} />)}
              {cats.length === 0 && (
                <div style={{ fontSize: 13, color: "var(--color-fg-4)", padding: "8px 0" }}>Sin categorías</div>
              )}
            </div>
          </div>
        );
      })}

      {adding ? (
        <AddForm onDone={() => setAdding(false)} />
      ) : (
        <button
          onClick={() => setAdding(true)}
          style={{
            padding: "11px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: "pointer",
            background: "var(--color-bg-1)", border: "1px dashed var(--color-hair)", color: "var(--color-fg-3)",
          }}
        >
          + Nueva categoría
        </button>
      )}
    </div>
  );
}
