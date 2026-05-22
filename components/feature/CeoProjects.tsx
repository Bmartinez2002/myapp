"use client";
import { useState, useTransition, useOptimistic } from "react";
import { useRouter } from "next/navigation";
import { Bar } from "@/components/ui/Bar";
import { Pill } from "@/components/ui/Pill";
import { Icon } from "@/components/ui/Icon";
import { cycleProjectStage, addProject, deleteProject, updateProjectProgress } from "@/app/actions/projects";

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
  { key: "lead",      label: "Lead",     pill: "plain"  as const },
  { key: "discovery", label: "Disc.",    pill: "plain"  as const },
  { key: "proposal",  label: "Prop.",    pill: "blue"   as const },
  { key: "active",    label: "En curso", pill: "green"  as const },
  { key: "won",       label: "Ganado",   pill: "green"  as const },
  { key: "paused",    label: "Pausado",  pill: "plain"  as const },
  { key: "lost",      label: "Perdido",  pill: "plain"  as const },
];

const MONTHS = ["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"];
function fmtDeadline(d: string | null): string {
  if (!d) return "—";
  const [, m, day] = d.split("-");
  return `${parseInt(day)} ${MONTHS[parseInt(m)-1]}`;
}
function fmtVal(cents: number): string {
  if (cents >= 1_000_000_00) return `$${(cents/100_000_000).toFixed(1).replace(/\.0$/,"")}M`;
  if (cents >= 1_000_00)     return `$${Math.round(cents/100_000)}K`;
  return `$${Math.round(cents/100).toLocaleString("es-CO")}`;
}

function AddProjectForm({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [name, setName]       = useState("");
  const [client, setClient]   = useState("");
  const [valueCOP, setVal]    = useState("");
  const [deadline, setDead]   = useState("");
  const [stage, setStage]     = useState("lead");

  const inp: React.CSSProperties = {
    background:"var(--color-bg-0)", border:"1px solid var(--color-hair)", borderRadius:9,
    padding:"8px 10px", fontSize:13, color:"var(--color-fg)", width:"100%", boxSizing:"border-box",
  };

  function submit() {
    if (!name.trim()) return;
    start(async () => {
      await addProject({
        name, client: client || undefined,
        value_cop: Number(valueCOP.replace(/[^0-9]/g,"")) || 0,
        deadline: deadline || undefined,
        stage,
      });
      setName(""); setClient(""); setVal(""); setDead(""); setStage("lead");
      setOpen(false);
      onDone();
    });
  }

  if (!open) return (
    <button onClick={() => setOpen(true)}
      style={{
        width:"100%", padding:"11px 0", borderRadius:10, fontSize:13.5, fontWeight:600,
        background:"oklch(.72 .17 250 / .1)", border:"1px dashed oklch(.72 .17 250 / .4)",
        color:"var(--color-accent-2)", cursor:"pointer",
      }}>
      + Nuevo proyecto
    </button>
  );

  return (
    <div style={{
      background:"var(--color-bg-1)", border:"1px solid oklch(.72 .17 250 / .4)",
      borderRadius:14, padding:14, display:"flex", flexDirection:"column", gap:10,
    }}>
      <div className="mono" style={{fontSize:10.5, letterSpacing:".1em", color:"var(--color-fg-3)"}}>NUEVO PROYECTO</div>
      <div style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:8}}>
        <div style={{gridColumn:"1/-1"}}>
          <label style={{fontSize:11, fontFamily:"monospace", color:"var(--color-fg-3)"}}>NOMBRE *</label>
          <input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="ej. App móvil cliente X"/>
        </div>
        <div>
          <label style={{fontSize:11, fontFamily:"monospace", color:"var(--color-fg-3)"}}>CLIENTE</label>
          <input style={inp} value={client} onChange={e=>setClient(e.target.value)} placeholder="ej. Alcaldía"/>
        </div>
        <div>
          <label style={{fontSize:11, fontFamily:"monospace", color:"var(--color-fg-3)"}}>VALOR ($COP)</label>
          <input style={inp} type="number" value={valueCOP} onChange={e=>setVal(e.target.value)} placeholder="1500000"/>
        </div>
        <div>
          <label style={{fontSize:11, fontFamily:"monospace", color:"var(--color-fg-3)"}}>ETAPA</label>
          <select style={{...inp, appearance:"none"}} value={stage} onChange={e=>setStage(e.target.value)}>
            {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
          </select>
        </div>
        <div>
          <label style={{fontSize:11, fontFamily:"monospace", color:"var(--color-fg-3)"}}>ENTREGA</label>
          <input style={inp} type="date" value={deadline} onChange={e=>setDead(e.target.value)}/>
        </div>
      </div>
      <div style={{display:"flex", gap:8}}>
        <button onClick={submit} disabled={pending||!name.trim()}
          style={{
            flex:1, padding:"9px", borderRadius:9, fontSize:13, fontWeight:600, cursor:"pointer",
            background:"oklch(.72 .17 250)", border:"none", color:"var(--color-bg-0)",
            opacity: pending||!name.trim() ? .5 : 1,
          }}>
          {pending ? "Guardando…" : "Agregar"}
        </button>
        <button onClick={() => setOpen(false)}
          style={{padding:"9px 16px", borderRadius:9, fontSize:13, cursor:"pointer",
            background:"transparent", border:"1px solid var(--color-hair)", color:"var(--color-fg-3)"}}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function ProjectCard({ p, onRefresh }: { p: CeoProject; onRefresh: () => void }) {
  const [, start] = useTransition();
  const [showDel, setShowDel] = useState(false);
  const [dragging, setDragging] = useState(false);

  const stg = STAGES.find(s => s.key === p.stage);

  function cycle() {
    const idx = STAGES.findIndex(s => s.key === p.stage);
    const next = STAGES[(idx < 0 ? 0 : idx + 1) % STAGES.length].key;
    start(async () => { await cycleProjectStage(p.id, p.stage); onRefresh(); });
  }

  function remove() {
    start(async () => { await deleteProject(p.id); onRefresh(); });
  }

  function setProgress(v: number) {
    start(async () => { await updateProjectProgress(p.id, v); onRefresh(); });
  }

  return (
    <div style={{
      background:"linear-gradient(180deg, oklch(0.19 .007 250) 0%, oklch(0.16 .006 250) 100%)",
      border:"1px solid var(--color-hair)", borderRadius:14, padding:"12px 14px",
    }}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8}}>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          {p.code && <span className="mono" style={{fontSize:10, color:"var(--color-fg-4)"}}>{p.code}</span>}
          <button onClick={cycle}
            style={{background:"transparent", border:"none", cursor:"pointer", padding:0}}>
            <Pill kind={stg?.pill ?? "plain"} style={{fontSize:10.5, cursor:"pointer"}}>
              {(stg?.label ?? p.stage).toUpperCase()} ↻
            </Pill>
          </button>
        </div>
        <div style={{display:"flex", alignItems:"center", gap:8}}>
          <span className="mono" style={{fontSize:14, fontWeight:500}}>{fmtVal(p.value_cents)}</span>
          <button onClick={() => setShowDel(v => !v)}
            style={{background:"transparent", border:"none", cursor:"pointer", color:"var(--color-fg-4)", padding:2}}>
            <Icon name="x" size={14}/>
          </button>
        </div>
      </div>

      <div style={{fontSize:13.5, fontWeight:600}}>{p.name}</div>
      <div className="mono" style={{fontSize:10.5, color:"var(--color-fg-4)", marginTop:2}}>
        {p.client && <>{p.client} · </>}entrega {fmtDeadline(p.deadline)}
      </div>

      {/* progress slider */}
      <div style={{marginTop:10, display:"flex", alignItems:"center", gap:8}}>
        <div style={{flex:1, height:6, borderRadius:99, background:"var(--color-bg-2)", position:"relative", cursor:"pointer"}}
          onClick={e => {
            const rect = e.currentTarget.getBoundingClientRect();
            const pct = Math.round(((e.clientX - rect.left) / rect.width) * 100);
            setProgress(Math.max(0, Math.min(100, pct)));
          }}>
          <div style={{
            height:"100%", borderRadius:99, width:`${p.progress}%`,
            background:"linear-gradient(90deg, oklch(.72 .17 250), oklch(.85 .18 150))",
            transition:"width .15s",
          }}/>
        </div>
        <span className="mono" style={{fontSize:11, color:"var(--color-fg-3)", minWidth:30, textAlign:"right"}}>
          {p.progress}%
        </span>
      </div>

      {showDel && (
        <div style={{marginTop:10, display:"flex", gap:8, alignItems:"center"}}>
          <span style={{fontSize:12, color:"var(--color-fg-3)"}}>¿Eliminar?</span>
          <button onClick={remove}
            style={{padding:"5px 12px", borderRadius:8, fontSize:12, cursor:"pointer",
              background:"oklch(.6 .18 25 / .12)", border:"1px solid oklch(.6 .18 25 / .35)",
              color:"oklch(.7 .15 25)"}}>
            Sí
          </button>
          <button onClick={() => setShowDel(false)}
            style={{padding:"5px 12px", borderRadius:8, fontSize:12, cursor:"pointer",
              background:"transparent", border:"1px solid var(--color-hair)", color:"var(--color-fg-3)"}}>
            No
          </button>
        </div>
      )}
    </div>
  );
}

export function CeoProjects({ projects }: { projects: CeoProject[] }) {
  const router = useRouter();
  const [, start] = useTransition();

  function refresh() { start(() => { router.refresh(); }); }

  return (
    <div style={{display:"flex", flexDirection:"column", gap:8}}>
      {projects.map(p => <ProjectCard key={p.id} p={p} onRefresh={refresh}/>)}
      <AddProjectForm onDone={refresh}/>
    </div>
  );
}
