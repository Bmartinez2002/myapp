"use client";
import { useTransition, useOptimistic } from "react";
import { Bar } from "@/components/ui/Bar";
import { Pill } from "@/components/ui/Pill";
import { cycleProjectStage } from "@/app/actions/projects";

export type CeoProject = {
  id: string;
  code: string | null;
  name: string;
  client: string | null;
  value_cents: number;
  progress: number;
  deadline: string | null;
  stage: string;
};

const STAGES = [
  { key: "lead",      label: "Lead",   pill: "plain"  as const },
  { key: "discovery", label: "Disc.",  pill: "plain"  as const },
  { key: "proposal",  label: "Prop.",  pill: "blue"   as const },
  { key: "active",    label: "Curso",  pill: "green"  as const },
  { key: "won",       label: "Cierre", pill: "green"  as const },
];

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function fmtDeadline(d: string | null): string {
  if (!d) return "—";
  const [, m, day] = d.split("-");
  return `${parseInt(day)} ${MONTHS[parseInt(m) - 1]}`;
}

type Props = { projects: CeoProject[] };

export function CeoProjects({ projects }: Props) {
  const [, startT] = useTransition();
  const [optimistic, applyOptimistic] = useOptimistic(
    projects,
    (prev: CeoProject[], { id, stage }: { id: string; stage: string }) =>
      prev.map(p => p.id === id ? { ...p, stage } : p),
  );

  function tap(p: CeoProject) {
    const idx = STAGES.findIndex(s => s.key === p.stage);
    const next = STAGES[(idx < 0 ? 0 : idx + 1) % STAGES.length].key;
    startT(async () => {
      applyOptimistic({ id: p.id, stage: next });
      await cycleProjectStage(p.id, p.stage);
    });
  }

  if (optimistic.length === 0) {
    return (
      <div className="rounded-card border p-4 text-center"
        style={{ background: "oklch(0.18 .007 250)", borderColor: "var(--color-hair)" }}>
        <div className="micro">SIN PROYECTOS</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {optimistic.map(p => {
        const stg = STAGES.find(s => s.key === p.stage);
        const pillKind = stg?.pill ?? "plain";
        const stgLabel = stg?.label ?? p.stage;
        return (
          <button
            key={p.id}
            onClick={() => tap(p)}
            className="w-full text-left rounded-card border p-3.5"
            style={{
              background: "linear-gradient(180deg, oklch(0.19 .007 250) 0%, oklch(0.16 .006 250) 100%)",
              borderColor: "var(--color-hair)",
              cursor: "pointer",
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center gap-2">
                {p.code && (
                  <span className="mono text-[10px]" style={{ color: "var(--color-fg-4)" }}>
                    {p.code}
                  </span>
                )}
                <Pill kind={pillKind}>{stgLabel.toUpperCase()}</Pill>
              </div>
              <span className="mono" style={{ fontSize: 14, fontWeight: 500 }}>
                {p.value_cents >= 1_000_000_00
                  ? `$${(p.value_cents / 100_000_000).toFixed(p.value_cents >= 10_000_000_00 ? 1 : 2).replace(/\.0+$/, "")}M`
                  : p.value_cents >= 1_000_00
                  ? `$${Math.round(p.value_cents / 100_000)}K`
                  : `$${Math.round(p.value_cents / 100).toLocaleString("es-CO")}`
                }
              </span>
            </div>
            <div style={{ fontSize: 13.5, fontWeight: 600, letterSpacing: "-.005em" }}>{p.name}</div>
            <div className="mono" style={{ fontSize: 10.5, color: "var(--color-fg-4)", marginTop: 2 }}>
              {p.client} · entrega {fmtDeadline(p.deadline)}
            </div>
            <div className="flex items-center gap-2.5 mt-2.5">
              <div className="flex-1">
                <Bar pct={p.progress ?? 0} />
              </div>
              <span className="mono text-[11px] shrink-0" style={{ color: "var(--color-fg-3)", minWidth: 32, textAlign: "right" }}>
                {p.progress ?? 0}%
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
