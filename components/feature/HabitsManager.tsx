"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addHabit, updateHabit, deleteHabit } from "@/app/actions/habits";

type Habit = {
  id: string;
  name: string;
  emoji: string | null;
  anti_fuga: boolean;
};

const SHIELD_COLOR = "oklch(.85 .18 150)";

function HabitRow({ h, onDone }: { h: Habit; onDone: () => void }) {
  const [editing, setEditing]   = useState(false);
  const [pending, start]        = useTransition();
  const [name, setName]         = useState(h.name);
  const [emoji, setEmoji]       = useState(h.emoji ?? "");
  const [antiFuga, setAntiFuga] = useState(h.anti_fuga);
  const [confirm, setConfirm]   = useState(false);

  const inputStyle: React.CSSProperties = {
    background: "var(--color-bg-0)", border: "1px solid var(--color-hair)",
    borderRadius: 8, padding: "7px 10px", fontSize: 13, color: "var(--color-fg)",
    width: "100%", boxSizing: "border-box",
  };

  function save() {
    start(async () => {
      await updateHabit(h.id, { name, emoji: emoji || undefined, anti_fuga: antiFuga });
      setEditing(false);
      onDone();
    });
  }

  function remove() {
    start(async () => {
      await deleteHabit(h.id);
      onDone();
    });
  }

  if (editing) {
    return (
      <div style={{
        background: "var(--color-bg-1)", border: "1px solid var(--color-accent)",
        borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10,
      }}>
        <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 8 }}>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>EMOJI</label>
            <input style={{...inputStyle, textAlign: "center", fontSize: 20}} value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2} />
          </div>
          <div>
            <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>NOMBRE</label>
            <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} />
          </div>
        </div>
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <div
            onClick={() => setAntiFuga(v => !v)}
            style={{
              width: 40, height: 22, borderRadius: 11, cursor: "pointer",
              background: antiFuga ? SHIELD_COLOR : "var(--color-bg-2)",
              border: "1px solid var(--color-hair)", position: "relative", transition: "background .15s",
            }}
          >
            <div style={{
              position: "absolute", top: 2, left: antiFuga ? 20 : 2, width: 16, height: 16,
              borderRadius: 8, background: "white", transition: "left .15s",
            }} />
          </div>
          <span style={{ fontSize: 12.5, color: "var(--color-fg-2)" }}>
            Hábito anti-fuga (cero domicilios / impulsos)
          </span>
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          <button type="button" onClick={save} disabled={pending || !name.trim()}
            style={{
              flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 600,
              cursor: "pointer", background: "var(--color-accent)", border: "none", color: "var(--color-bg-0)",
              opacity: pending || !name.trim() ? 0.5 : 1,
            }}>
            {pending ? "Guardando…" : "Guardar"}
          </button>
          <button type="button" onClick={() => setEditing(false)}
            style={{
              padding: "9px 16px", borderRadius: 9, fontSize: 13, cursor: "pointer",
              background: "transparent", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)",
            }}>
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
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center",
          background: "var(--color-bg-2)", border: "1px solid var(--color-hair)",
          fontSize: 18, flexShrink: 0,
        }}>
          {h.emoji ?? "✦"}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 13.5, fontWeight: 500 }}>{h.name}</span>
            {h.anti_fuga && (
              <span style={{
                fontSize: 10, fontFamily: "monospace", fontWeight: 600,
                color: SHIELD_COLOR, border: `1px solid ${SHIELD_COLOR}`,
                borderRadius: 99, padding: "1px 6px",
              }}>
                ANTI-FUGA
              </span>
            )}
          </div>
          <div style={{ fontSize: 11, color: "var(--color-fg-4)", marginTop: 2, fontFamily: "monospace" }}>
            Diario
          </div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button type="button" onClick={() => setEditing(true)}
            style={{
              padding: "6px 10px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: "transparent", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)",
            }}>
            Editar
          </button>
        </div>
      </div>

      {confirm ? (
        <div style={{ marginTop: 10, display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "var(--color-fg-3)" }}>¿Eliminar este hábito?</span>
          <button type="button" onClick={remove} disabled={pending}
            style={{
              padding: "5px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: "oklch(.6 .18 25 / .12)", border: "1px solid oklch(.6 .18 25 / .35)",
              color: "oklch(.7 .15 25)",
            }}>
            Sí
          </button>
          <button type="button" onClick={() => setConfirm(false)}
            style={{ padding: "5px 12px", borderRadius: 8, fontSize: 12, cursor: "pointer",
              background: "transparent", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)" }}>
            No
          </button>
        </div>
      ) : (
        <button type="button" onClick={() => setConfirm(true)}
          style={{
            marginTop: 8, padding: 0, background: "transparent", border: "none",
            fontSize: 11, color: "var(--color-fg-4)", cursor: "pointer", textDecoration: "underline",
          }}>
          Eliminar
        </button>
      )}
    </div>
  );
}

function AddForm({ onDone }: { onDone: () => void }) {
  const [open, setOpen]           = useState(false);
  const [pending, start]          = useTransition();
  const [name, setName]           = useState("");
  const [emoji, setEmoji]         = useState("");
  const [antiFuga, setAntiFuga]   = useState(false);

  const inputStyle: React.CSSProperties = {
    background: "var(--color-bg-0)", border: "1px solid var(--color-hair)",
    borderRadius: 8, padding: "7px 10px", fontSize: 13, color: "var(--color-fg)",
    width: "100%", boxSizing: "border-box",
  };

  function submit() {
    if (!name.trim()) return;
    start(async () => {
      await addHabit({ name, emoji: emoji || undefined, anti_fuga: antiFuga });
      setName(""); setEmoji(""); setAntiFuga(false);
      setOpen(false);
      onDone();
    });
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)}
        style={{
          width: "100%", padding: "11px 0", borderRadius: 10, fontSize: 13.5, fontWeight: 600,
          background: "oklch(.65 .18 150 / .1)", border: "1px dashed oklch(.65 .18 150 / .4)",
          color: "var(--color-accent)", cursor: "pointer",
        }}>
        + Agregar hábito
      </button>
    );
  }

  return (
    <div style={{
      background: "var(--color-bg-1)", border: "1px solid var(--color-accent)",
      borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10,
    }}>
      <div className="mono" style={{ fontSize: 10.5, letterSpacing: ".1em", color: "var(--color-fg-3)" }}>
        NUEVO HÁBITO
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "56px 1fr", gap: 8 }}>
        <div>
          <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>EMOJI</label>
          <input style={{...inputStyle, textAlign: "center", fontSize: 20}} value={emoji} onChange={e => setEmoji(e.target.value)} maxLength={2} placeholder="✦" />
        </div>
        <div>
          <label style={{ fontSize: 11, color: "var(--color-fg-3)", fontFamily: "monospace" }}>NOMBRE *</label>
          <input style={inputStyle} value={name} onChange={e => setName(e.target.value)} placeholder="ej. Sin domicilios" />
        </div>
      </div>
      <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
        <div
          onClick={() => setAntiFuga(v => !v)}
          style={{
            width: 40, height: 22, borderRadius: 11, cursor: "pointer",
            background: antiFuga ? SHIELD_COLOR : "var(--color-bg-2)",
            border: "1px solid var(--color-hair)", position: "relative", transition: "background .15s",
          }}
        >
          <div style={{
            position: "absolute", top: 2, left: antiFuga ? 20 : 2, width: 16, height: 16,
            borderRadius: 8, background: "white", transition: "left .15s",
          }} />
        </div>
        <span style={{ fontSize: 12.5, color: "var(--color-fg-2)" }}>
          Es hábito anti-fuga
        </span>
      </label>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={submit} disabled={pending || !name.trim()}
          style={{
            flex: 1, padding: "9px 0", borderRadius: 9, fontSize: 13, fontWeight: 600,
            cursor: "pointer", background: "var(--color-accent)", border: "none", color: "var(--color-bg-0)",
            opacity: pending || !name.trim() ? 0.5 : 1,
          }}>
          {pending ? "Guardando…" : "Agregar"}
        </button>
        <button type="button" onClick={() => setOpen(false)}
          style={{
            padding: "9px 16px", borderRadius: 9, fontSize: 13, cursor: "pointer",
            background: "transparent", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)",
          }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

export function HabitsManager({ initialHabits }: { initialHabits: Habit[] }) {
  const router = useRouter();
  const [, start] = useTransition();

  function refresh() {
    start(() => { router.refresh(); });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {initialHabits.map(h => (
        <HabitRow key={h.id} h={h} onDone={refresh} />
      ))}
      <AddForm onDone={refresh} />
    </div>
  );
}
