import { supabaseServer } from "@/lib/supabase/server";
import { fmtCOP } from "@/lib/money";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { CeoProjects, type CeoProject } from "@/components/feature/CeoProjects";

export const dynamic = "force-dynamic";

const STAGES = [
  { key: "lead",      label: "Lead",   col: "oklch(0.3 .008 250)" },
  { key: "discovery", label: "Disc.",  col: "oklch(0.4 .04 250)"  },
  { key: "proposal",  label: "Prop.",  col: "oklch(0.72 .17 250)" },
  { key: "active",    label: "Curso",  col: "oklch(.85 .18 150)"  },
  { key: "won",       label: "Cierre", col: "oklch(.93 .14 150)"  },
];

function MiniStat({ lbl, v, delta, accent }: { lbl: string; v: string; delta?: string; accent?: boolean }) {
  return (
    <div className="rounded-card border p-2.5"
      style={{ background: "linear-gradient(180deg, oklch(0.19 .007 250) 0%, oklch(0.16 .006 250) 100%)", borderColor: "var(--color-hair)" }}>
      <div className="micro" style={{ fontSize: 9 }}>{lbl}</div>
      <div className="mono mt-1" style={{ fontSize: 16, fontWeight: 500, color: accent ? "var(--color-accent)" : "var(--color-fg)" }}>
        {v}
      </div>
      {delta && (
        <div className="mono mt-0.5" style={{ fontSize: 9.5, color: delta.startsWith("+") ? "var(--color-accent)" : "var(--color-danger)" }}>
          {delta}
        </div>
      )}
    </div>
  );
}

export default async function CeoPage() {
  const sb = await supabaseServer();

  const { data: raw } = await sb
    .from("projects")
    .select("id, code, name, client, value_cents, progress, deadline, stage")
    .order("created_at", { ascending: false });

  const projectsArr = (raw ?? []).map(p => ({
    ...p,
    value_cents: Number(p.value_cents ?? 0),
    progress:    Number(p.progress ?? 0),
  })) as CeoProject[];

  // ── pipeline stats ─────────────────────────────────────────────
  const totalPipeline = projectsArr.reduce((s, p) => s + p.value_cents, 0);
  const wonCount      = projectsArr.filter(p => p.stage === "won").length;
  const closeRate     = projectsArr.length
    ? Math.round((wonCount / projectsArr.length) * 100)
    : 0;
  const weighted90d   = Math.round(totalPipeline * 0.4);

  const activeVal = projectsArr
    .filter(p => p.stage === "active" || p.stage === "proposal")
    .reduce((s, p) => s + p.value_cents, 0);
  const mrrProj = Math.round(activeVal / 3);

  // ── stage breakdown for stacked bar ───────────────────────────
  const stageCounts = STAGES.map(s => {
    const matching = projectsArr.filter(p => p.stage === s.key);
    return {
      ...s,
      n:   matching.length,
      val: matching.reduce((sum, p) => sum + p.value_cents, 0),
    };
  });

  return (
    <div className="px-4 md:px-6 py-4 md:py-6 flex flex-col gap-3.5 max-w-2xl mx-auto md:max-w-none">

      {/* ─ Header ───────────────────────────────────────────────── */}
      <header className="flex items-end justify-between">
        <div>
          <div className="micro">CEO MODE · OPERACIONES</div>
          <h1 className="text-2xl md:text-3xl font-semibold tracking-tight mt-1">Pipeline</h1>
        </div>
        <Pill kind="blue">{projectsArr.length} PROYECTOS</Pill>
      </header>

      {/* ─ Hero: pipeline ───────────────────────────────────────── */}
      <Card glow>
        <div className="flex justify-between items-start">
          <div>
            <div className="micro">PIPELINE ACTIVO</div>
            <div className="mono mt-1.5 leading-none"
              style={{ fontSize: 34, fontWeight: 500, letterSpacing: "-.02em" }}>
              {fmtCOP(totalPipeline)}
            </div>
            <div className="flex items-center gap-1.5 mt-1.5">
              <Pill kind="blue">{projectsArr.length} PROYECTOS</Pill>
              <span className="mono text-[11px]" style={{ color: "var(--color-fg-3)" }}>
                {closeRate}% close rate
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="micro" style={{ fontSize: 9 }}>WEIGHTED · 90D</div>
            <div className="mono mt-1.5" style={{ fontSize: 18, color: "var(--color-accent)" }}>
              {fmtCOP(weighted90d)}
            </div>
          </div>
        </div>

        {/* Stacked stage bar */}
        <div className="mt-3.5">
          <div style={{ display: "flex", height: 10, borderRadius: 6, overflow: "hidden", border: "1px solid var(--color-hair)" }}>
            {stageCounts.map(s => (
              <div key={s.key} style={{ flex: s.val > 0 ? s.val / 1_000_000 : 0.3, background: s.col }} />
            ))}
          </div>
          <div className="flex justify-between mt-1.5 mono" style={{ fontSize: 9.5, color: "var(--color-fg-4)" }}>
            {stageCounts.map(s => (
              <span key={s.key}>{s.label} {s.n}</span>
            ))}
          </div>
        </div>
      </Card>

      {/* ─ Stats grid ────────────────────────────────────────────── */}
      <div className="grid grid-cols-3 gap-2">
        <MiniStat lbl="MRR PROY."  v={fmtCOP(mrrProj)}   delta="+12%"       />
        <MiniStat lbl="CIERRE"     v={`${closeRate}%`}    delta="+6%"        />
        <MiniStat lbl="AUTO HRS"   v="25h/m"              delta="+18%" accent />
      </div>

      {/* ─ Projects list ─────────────────────────────────────────── */}
      <section>
        <div className="flex justify-between items-center pt-1 pb-2.5 px-1">
          <span className="micro">PROYECTOS ACTIVOS</span>
          <span className="mono text-[10.5px]" style={{ color: "var(--color-fg-4)" }}>
            TAP · CAMBIAR STAGE
          </span>
        </div>
        <CeoProjects projects={projectsArr} />
      </section>

    </div>
  );
}
