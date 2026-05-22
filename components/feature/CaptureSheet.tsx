"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Icon } from "@/components/ui/Icon";
import { Pill } from "@/components/ui/Pill";
import { Card } from "@/components/ui/Card";
import { parseAmount } from "@/lib/parse-amount";
import { fmtCOP } from "@/lib/money";
import { saveCapture } from "@/app/actions/capture";

type Cat = { id: string; slug: string; name: string; emoji: string | null; kind: string; risk_tier: string | null };

export function CaptureSheet({ categories }: { categories: Cat[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [kind, setKind] = useState<"expense" | "income">("expense");
  const [amountStr, setAmountStr] = useState("");
  const [catId, setCatId] = useState<string | null>(null);
  const [need, setNeed] = useState<string | null>(null);
  const [emoBefore, setEmoBefore] = useState<string | null>(null);
  const [emoAfter, setEmoAfter] = useState<number | null>(null);

  const amount = parseAmount(amountStr) ?? 0;
  const cents = amount * 100;
  const filteredCats = categories.filter(c => kind === "income" ? c.kind === "income" : c.kind === "expense");

  function tap(d: string) {
    setAmountStr(prev => {
      if (d === "⌫") return prev.slice(0, -1);
      if (d === "k" || d === "m") return prev + d;
      if (d === ".") return prev.includes(".") ? prev : prev + ".";
      return prev + d;
    });
  }

  async function commit() {
    start(async () => {
      await saveCapture({
        amount_cents: cents,
        kind: kind === "income" ? "income" : "expense",
        category_slug: categories.find(c => c.id === catId)?.slug,
        need: (need as any) ?? undefined,
        emotion_before: emoBefore ?? undefined,
        emotion_after_score: emoAfter ?? undefined,
      });
      router.push("/");
      router.refresh();
    });
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* progress */}
      <div className="px-4 md:px-6 pt-4">
        <div className="flex justify-between items-center">
          <button onClick={() => step > 1 ? setStep((step - 1) as any) : router.back()} className="size-8 rounded-[10px] grid place-items-center text-fg-2" style={{background:'var(--color-bg-2)', border:'1px solid var(--color-hair)'}}>
            <Icon name="chev" size={14} style={{transform:'rotate(180deg)'}}/>
          </button>
          <div className="micro">PASO {step} / 3</div>
          <button onClick={() => router.back()} className="text-fg-3 text-[12px] mono">SALIR</button>
        </div>
        <div className="mt-3 flex gap-1">
          {[1,2,3].map(i => (
            <div key={i} style={{
              flex:1, height:3, borderRadius:99,
              background: i <= step ? 'var(--color-accent)' : 'var(--color-bg-2)',
              boxShadow: i === step ? '0 0 8px var(--color-accent)' : 'none',
            }}/>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 md:px-6 py-6 overflow-auto max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="s1" initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}} className="flex flex-col gap-6">
              <div className="flex justify-center gap-2">
                {[["expense","Gasto"],["income","Ingreso"]].map(([v,l]) => (
                  <button key={v} onClick={() => setKind(v as any)} className="px-5 py-2 rounded-chip text-[12px]" style={{
                    background: kind === v ? 'var(--color-accent-soft)' : 'var(--color-bg-2)',
                    border:'1px solid ' + (kind === v ? 'oklch(.85 .18 150 / .5)' : 'var(--color-hair)'),
                    color: kind === v ? 'var(--color-accent)' : 'var(--color-fg-2)'
                  }}>{l}</button>
                ))}
              </div>

              <div className="text-center">
                <div className="micro">{kind === "income" ? "INGRESO" : "GASTO"}</div>
                <div className="mt-3 flex items-baseline justify-center gap-2">
                  <span className="mono text-fg-3 text-2xl">$</span>
                  <span className="mono text-[68px] font-medium leading-none tracking-tight">{amountStr ? amount.toLocaleString("es-CO") : "0"}</span>
                  <span className="mono text-fg-3 text-sm">COP</span>
                </div>
                <div className="mono text-[10px] mt-1.5" style={{color:'var(--color-fg-4)'}}>Tip: usa <strong>k</strong> para mil · <strong>m</strong> para millón</div>
              </div>

              <div className="grid grid-cols-3 gap-2 md:max-w-sm md:mx-auto md:w-full">
                {["1","2","3","4","5","6","7","8","9","k","0","⌫"].map(d => (
                  <button key={d} onClick={() => tap(d)} className="py-4 rounded-card text-xl font-medium" style={{background:'var(--color-bg-2)', border:'1px solid var(--color-hair)'}}>
                    {d}
                  </button>
                ))}
              </div>

              <button
                disabled={cents <= 0}
                onClick={() => setStep(2)}
                className="py-4 rounded-card font-semibold text-bg-0 disabled:opacity-50"
                style={{background:'linear-gradient(180deg, oklch(.93 .14 150), oklch(.78 .18 150))', boxShadow:'0 0 24px oklch(.85 .18 150 / .35)'}}>
                Siguiente · {fmtCOP(cents)}
              </button>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="s2" initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}} className="flex flex-col gap-4">
              <div className="text-center">
                <div className="micro">¿EN QUÉ?</div>
                <div className="mono text-[34px] font-medium mt-2">{kind === "income" ? "+" : "−"}{fmtCOP(cents)}</div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {filteredCats.map(c => (
                  <button key={c.id} onClick={() => { setCatId(c.id); setStep(3); }} className="p-3 rounded-card text-left" style={{
                    background: catId === c.id ? 'var(--color-accent-soft)' : 'oklch(0.18 .007 250)',
                    border:'1px solid ' + (catId === c.id ? 'oklch(.85 .18 150 / .5)' : 'var(--color-hair)'),
                  }}>
                    <div className="text-xl">{c.emoji ?? "•"}</div>
                    <div className="text-[12px] font-medium mt-1">{c.name}</div>
                    {c.risk_tier === "danger" && <Pill kind="amber" className="mt-1.5">vigilar</Pill>}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="s3" initial={{opacity:0, y:8}} animate={{opacity:1, y:0}} exit={{opacity:0, y:-8}} className="flex flex-col gap-4">
              <Card>
                <div className="micro">REGISTRADO</div>
                <div className="mono text-[28px] font-medium mt-1">{kind === "income" ? "+" : "−"}{fmtCOP(cents)}</div>
                <div className="text-fg-3 text-[12px] mt-1">{categories.find(c => c.id === catId)?.name}</div>
              </Card>

              {kind === "expense" && (
                <>
                  <div>
                    <div className="micro mb-2">¿NECESIDAD O IMPULSO? <span className="text-fg-4 normal-case ml-1 tracking-normal">(opcional)</span></div>
                    <div className="grid grid-cols-2 gap-2">
                      <Choice label="Necesario"  sel={need === "necessary"} onClick={() => setNeed("necessary")} color="var(--color-accent)"/>
                      <Choice label="Impulso"    sel={need === "impulse"}   onClick={() => setNeed("impulse")}   color="var(--color-warn)"/>
                    </div>
                  </div>

                  <div>
                    <div className="micro mb-2">EMOCIÓN</div>
                    <div className="flex flex-wrap gap-1.5">
                      {[["😌","tranquilo"],["😏","antojo"],["😩","estrés"],["🥺","triste"],["🤩","euforia"],["🥱","aburrido"]].map(([e,l]) => (
                        <button key={l} onClick={() => setEmoBefore(l)} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-chip text-[12px]" style={{
                          background: emoBefore === l ? 'oklch(.82 .16 80 / .18)' : 'oklch(0.18 .007 250)',
                          border:'1px solid ' + (emoBefore === l ? 'oklch(.82 .16 80 / .5)' : 'var(--color-hair)'),
                          color: emoBefore === l ? 'var(--color-warn)' : 'var(--color-fg-2)'
                        }}>
                          <span>{e}</span><span>{l}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="micro mb-2">¿CÓMO TE SIENTES DESPUÉS?</div>
                    <div className="flex gap-2 justify-between">
                      {["😟","😕","😐","🙂","😄"].map((e, i) => (
                        <button key={i} onClick={() => setEmoAfter(i + 1)} className="flex-1 h-12 rounded-card grid place-items-center text-xl" style={{
                          background: emoAfter === i + 1 ? 'oklch(.85 .18 150 / .15)' : 'oklch(0.18 .007 250)',
                          border:'1px solid ' + (emoAfter === i + 1 ? 'oklch(.85 .18 150 / .5)' : 'var(--color-hair)'),
                        }}>{e}</button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              <button disabled={pending} onClick={commit} className="py-4 rounded-card font-semibold text-bg-0" style={{background:'linear-gradient(180deg, oklch(.93 .14 150), oklch(.78 .18 150))', boxShadow:'0 0 24px oklch(.85 .18 150 / .35)'}}>
                {pending ? "Guardando…" : "Confirmar"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function Choice({ label, sel, onClick, color }: { label: string; sel: boolean; onClick: () => void; color: string }) {
  return (
    <button onClick={onClick} className="p-3.5 rounded-card text-left" style={{
      background: sel ? `color-mix(in oklch, ${color} 15%, transparent)` : 'oklch(0.18 .007 250)',
      border:'1px solid ' + (sel ? `color-mix(in oklch, ${color} 50%, transparent)` : 'var(--color-hair)'),
      boxShadow: sel ? `0 0 22px color-mix(in oklch, ${color} 25%, transparent)` : 'none',
    }}>
      <div className="text-[14px] font-semibold">{label}</div>
    </button>
  );
}
