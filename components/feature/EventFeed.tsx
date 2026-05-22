"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fmtCOP } from "@/lib/money";
import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/ui/Icon";
import { deleteMoneyEvent, updateMoneyEvent } from "@/app/actions/events";

type Cat = { id: string; name: string; emoji: string | null; risk_tier: string | null };

export type EventRow = {
  id: string;
  occurred_at: string;
  kind: string;
  amount_cents: number;
  merchant: string | null;
  need: string | null;
  note: string | null;
  categories: { name: string; emoji: string | null; risk_tier: string | null } | null;
};

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", timeZone: "America/Bogota" });
}

function EditSheet({
  ev, cats, onClose,
}: {
  ev: EventRow;
  cats: Cat[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [amount, setAmount] = useState(String(Math.round(ev.amount_cents / 100)));
  const [merchant, setMerchant] = useState(ev.merchant ?? "");
  const [note, setNote] = useState(ev.note ?? "");
  const [need, setNeed] = useState(ev.need ?? "");
  const [catId, setCatId] = useState<string | null>(
    // find cat id by name match (categories only has name/emoji, not id)
    null
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const inputStyle: React.CSSProperties = {
    background: "var(--color-bg-0)", border: "1px solid var(--color-hair)",
    borderRadius: 10, padding: "10px 12px", fontSize: 14, color: "var(--color-fg)",
    width: "100%", boxSizing: "border-box", outline: "none",
  };

  function save() {
    const cents = Number(amount.replace(/[^0-9]/g, "")) * 100;
    start(async () => {
      await updateMoneyEvent(ev.id, {
        amount_cents: cents || ev.amount_cents,
        merchant: merchant.trim() || null,
        note: note.trim() || null,
        need: need || null,
      });
      router.refresh();
      onClose();
    });
  }

  function remove() {
    start(async () => {
      await deleteMoneyEvent(ev.id);
      router.refresh();
      onClose();
    });
  }

  const isIncome = ev.kind === "income" || ev.kind === "block";

  return (
    <>
      {/* backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed", inset: 0, background: "oklch(0 0 0 / .6)",
          zIndex: 40, backdropFilter: "blur(4px)",
        }}
      />
      {/* sheet */}
      <div style={{
        position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 50,
        background: "var(--color-bg-1)", borderRadius: "20px 20px 0 0",
        padding: "20px 20px 40px", maxWidth: 600, margin: "0 auto",
        boxShadow: "0 -8px 40px oklch(0 0 0 / .4)",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <div className="mono" style={{ fontSize: 11, letterSpacing: ".1em", color: "var(--color-fg-3)" }}>
            EDITAR MOVIMIENTO
          </div>
          <button onClick={onClose} style={{ background: "transparent", border: "none", cursor: "pointer", color: "var(--color-fg-3)" }}>
            <Icon name="x" size={18} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontFamily: "monospace", color: "var(--color-fg-3)" }}>
              MONTO ($COP)
            </label>
            <input style={inputStyle} type="number" value={amount} onChange={e => setAmount(e.target.value)} />
          </div>

          <div>
            <label style={{ fontSize: 11, fontFamily: "monospace", color: "var(--color-fg-3)" }}>
              DESCRIPCIÓN / COMERCIANTE
            </label>
            <input style={inputStyle} value={merchant} onChange={e => setMerchant(e.target.value)} placeholder="ej. Domino's, Éxito…" />
          </div>

          {!isIncome && (
            <div>
              <label style={{ fontSize: 11, fontFamily: "monospace", color: "var(--color-fg-3)" }}>
                CLASIFICACIÓN
              </label>
              <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                {[["necessary", "✅ Necesario"], ["impulse", "⚡ Impulso"], ["protected", "🛡️ Protegido"]].map(([v, l]) => (
                  <button key={v} onClick={() => setNeed(need === v ? "" : v)}
                    style={{
                      flex: 1, padding: "8px 4px", borderRadius: 10, fontSize: 11.5, cursor: "pointer",
                      fontWeight: 500, transition: "all .15s",
                      background: need === v ? "var(--color-accent)" : "var(--color-bg-2)",
                      border: "1px solid " + (need === v ? "transparent" : "var(--color-hair)"),
                      color: need === v ? "#06120c" : "var(--color-fg-2)",
                    }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div>
            <label style={{ fontSize: 11, fontFamily: "monospace", color: "var(--color-fg-3)" }}>
              NOTA
            </label>
            <textarea style={{ ...inputStyle, resize: "none", fontFamily: "inherit" }}
              value={note} onChange={e => setNote(e.target.value)} rows={2}
              placeholder="¿Algo que quieras recordar?" />
          </div>

          <button onClick={save} disabled={pending}
            style={{
              padding: "14px", borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: "pointer",
              background: "var(--color-accent)", border: "none", color: "#06120c",
              opacity: pending ? 0.6 : 1,
            }}>
            {pending ? "Guardando…" : "Guardar cambios"}
          </button>

          {!confirmDelete ? (
            <button onClick={() => setConfirmDelete(true)}
              style={{
                padding: "10px", borderRadius: 12, fontSize: 13, cursor: "pointer",
                background: "oklch(.6 .18 25 / .1)", border: "1px solid oklch(.6 .18 25 / .3)",
                color: "oklch(.7 .15 25)",
              }}>
              Eliminar movimiento
            </button>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button onClick={remove} disabled={pending}
                style={{
                  flex: 1, padding: "10px", borderRadius: 12, fontSize: 13, cursor: "pointer",
                  background: "oklch(.6 .18 25 / .2)", border: "1px solid oklch(.6 .18 25 / .4)",
                  color: "oklch(.7 .15 25)", fontWeight: 600,
                }}>
                Sí, eliminar
              </button>
              <button onClick={() => setConfirmDelete(false)}
                style={{
                  flex: 1, padding: "10px", borderRadius: 12, fontSize: 13, cursor: "pointer",
                  background: "transparent", border: "1px solid var(--color-hair)", color: "var(--color-fg-3)",
                }}>
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

export function EventFeed({ events, cats }: { events: EventRow[]; cats: Cat[] }) {
  const [editing, setEditing] = useState<EventRow | null>(null);

  if (events.length === 0) return null;

  return (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {events.map(e => {
          const isIncome = e.kind === "income" || e.kind === "block";
          return (
            <button
              key={e.id}
              onClick={() => setEditing(e)}
              style={{
                display: "flex", alignItems: "center", gap: 12,
                padding: 12, borderRadius: 14,
                background: "oklch(0.18 .007 250 / .5)",
                border: "1px solid var(--color-hair)",
                cursor: "pointer", width: "100%", textAlign: "left",
                transition: "border-color .15s",
              }}
              onMouseEnter={el => (el.currentTarget.style.borderColor = "oklch(.85 .18 150 / .3)")}
              onMouseLeave={el => (el.currentTarget.style.borderColor = "var(--color-hair)")}
            >
              <div style={{
                width: 36, height: 36, borderRadius: 10, display: "grid", placeItems: "center",
                fontSize: 18, flexShrink: 0,
                background: "var(--color-bg-2)", border: "1px solid var(--color-hair)",
              }}>
                {e.categories?.emoji ?? (isIncome ? "💼" : "💳")}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {e.merchant ?? e.categories?.name ?? (isIncome ? "Ingreso" : "Gasto")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3, flexWrap: "wrap" }}>
                  <span className="mono" style={{ fontSize: 10, color: "var(--color-fg-4)" }}>
                    {fmtTime(e.occurred_at)}
                  </span>
                  {e.need === "impulse"   && <Pill kind="amber" style={{fontSize:9}}>impulso</Pill>}
                  {e.need === "necessary" && <Pill kind="green" style={{fontSize:9}}>necesario</Pill>}
                  {e.need === "protected" && <Pill kind="blue"  style={{fontSize:9}}>protegido</Pill>}
                  {e.note && <span style={{ fontSize: 10, color: "var(--color-fg-4)" }}>· {e.note.slice(0, 30)}</span>}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                <span className="mono" style={{
                  fontSize: 14, fontWeight: 600,
                  color: isIncome ? "var(--color-accent)" : "var(--color-fg)",
                }}>
                  {isIncome ? "+" : "−"}{fmtCOP(e.amount_cents)}
                </span>
                <Icon name="edit" size={13} style={{ color: "var(--color-fg-4)" }} />
              </div>
            </button>
          );
        })}
      </div>

      {editing && (
        <EditSheet ev={editing} cats={cats} onClose={() => setEditing(null)} />
      )}
    </>
  );
}
