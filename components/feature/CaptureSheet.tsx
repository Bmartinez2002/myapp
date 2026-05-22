"use client";
import { useState, useRef, useTransition } from "react";
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
  const [step, setStep]       = useState<1 | 2 | 3>(1);
  const [kind, setKind]       = useState<"expense" | "income">("expense");
  const [amountStr, setAmountStr] = useState("");
  const [merchant, setMerchant]   = useState("");
  const [catId, setCatId]     = useState<string | null>(null);
  const [need, setNeed]       = useState<string | null>(null);
  const [emoBefore, setEmoBefore] = useState<string | null>(null);
  const [emoAfter, setEmoAfter]   = useState<number | null>(null);
  const [note, setNote]       = useState("");
  const [saved, setSaved]     = useState(false);
  const merchantRef = useRef<HTMLInputElement>(null);

  const amount = parseAmount(amountStr) ?? 0;
  const cents  = amount * 100;
  const filteredCats = categories.filter(c =>
    kind === "income" ? c.kind === "income" : (c.kind === "expense" || c.kind === "debt_payment")
  );

  function tap(d: string) {
    setAmountStr(prev => {
      if (d === "⌫") return prev.slice(0, -1);
      if (d === "k") return prev + "000";
      if (d === "m") return prev + "000000";
      if (d === ".") return prev.includes(".") ? prev : prev + ".";
      return prev + d;
    });
  }

  function goToStep2() {
    setStep(2);
    setTimeout(() => merchantRef.current?.focus(), 200);
  }

  function selectCat(id: string) {
    setCatId(id);
    setStep(3);
  }

  function skipCat() {
    setCatId(null);
    setStep(3);
  }

  async function commit() {
    start(async () => {
      await saveCapture({
        amount_cents: cents,
        kind: kind === "income" ? "income" : "expense",
        category_slug: categories.find(c => c.id === catId)?.slug,
        need:  (need as any) ?? undefined,
        emotion_before: emoBefore ?? undefined,
        emotion_after_score: emoAfter ?? undefined,
        merchant: merchant.trim() || undefined,
        note:     note.trim()     || undefined,
      });
      setSaved(true);
      setTimeout(() => router.push("/today"), 800);
    });
  }

  // ── Saved confirmation ──────────────────────────────────────────
  if (saved) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4 px-6">
        <motion.div initial={{scale:.8, opacity:0}} animate={{scale:1, opacity:1}} transition={{type:"spring", stiffness:300}}>
          <div style={{
            width:72, height:72, borderRadius:"50%", display:"grid", placeItems:"center",
            background:"linear-gradient(135deg, oklch(.93 .14 150), oklch(.78 .18 150))",
            boxShadow:"0 0 40px oklch(.85 .18 150 / .5)",
          }}>
            <Icon name="check" size={28} stroke={2.5} style={{color:"#06120c"}}/>
          </div>
        </motion.div>
        <div className="text-center">
          <div className="text-[20px] font-semibold">¡Registrado!</div>
          <div className="mono text-[13px] mt-1" style={{color:"var(--color-fg-3)"}}>
            {kind === "income" ? "+" : "−"}{fmtCOP(cents)}
            {categories.find(c => c.id === catId)?.name ? ` · ${categories.find(c => c.id === catId)!.name}` : ""}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh flex flex-col">
      {/* header */}
      <div className="px-4 md:px-6 pt-4 shrink-0">
        <div className="flex justify-between items-center">
          <button
            onClick={() => step > 1 ? setStep((step - 1) as any) : router.back()}
            className="size-8 rounded-[10px] grid place-items-center text-fg-2"
            style={{background:"var(--color-bg-2)", border:"1px solid var(--color-hair)"}}>
            <Icon name="chev" size={14} style={{transform:"rotate(180deg)"}}/>
          </button>
          <div className="mono text-[11px] tracking-widest" style={{color:"var(--color-fg-3)"}}>
            {step === 1 ? "MONTO" : step === 2 ? "CATEGORÍA" : "CLASIFICAR"}
          </div>
          <button onClick={() => router.back()} className="text-fg-3 text-[12px] mono">SALIR</button>
        </div>
        <div className="mt-3 flex gap-1">
          {[1,2,3].map(i => (
            <div key={i} style={{
              flex:1, height:3, borderRadius:99,
              background: i <= step ? "var(--color-accent)" : "var(--color-bg-2)",
              boxShadow: i === step ? "0 0 8px var(--color-accent)" : "none",
              transition: "background .2s",
            }}/>
          ))}
        </div>
      </div>

      <div className="flex-1 px-4 md:px-6 py-6 overflow-auto max-w-2xl mx-auto w-full">
        <AnimatePresence mode="wait">

          {/* ── STEP 1: Monto ───────────────────────────────────── */}
          {step === 1 && (
            <motion.div key="s1" initial={{opacity:0, x:24}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-24}}
              transition={{duration:.18}} className="flex flex-col gap-5">

              {/* kind toggle */}
              <div className="flex justify-center gap-2">
                {([["expense","💳 Gasto"],["income","💼 Ingreso"]] as const).map(([v,l]) => (
                  <button key={v} onClick={() => { setKind(v); setCatId(null); }}
                    className="px-5 py-2 rounded-full text-[13px] font-medium transition-all"
                    style={{
                      background: kind === v ? "var(--color-accent)" : "var(--color-bg-2)",
                      border: "1px solid " + (kind === v ? "transparent" : "var(--color-hair)"),
                      color: kind === v ? "#06120c" : "var(--color-fg-2)",
                    }}>
                    {l}
                  </button>
                ))}
              </div>

              {/* amount display */}
              <div className="text-center">
                <div className="mt-2 flex items-baseline justify-center gap-2">
                  <span className="mono text-fg-3 text-2xl">$</span>
                  <span className="mono font-medium leading-none tracking-tight"
                    style={{fontSize: amountStr.length > 8 ? 42 : 68, color: cents > 0 ? "var(--color-fg)" : "var(--color-fg-4)"}}>
                    {amountStr ? amount.toLocaleString("es-CO") : "0"}
                  </span>
                  <span className="mono text-fg-3 text-sm">COP</span>
                </div>
                <div className="mono text-[10px] mt-1.5" style={{color:"var(--color-fg-4)"}}>
                  <strong>k</strong> = miles &nbsp;·&nbsp; <strong>m</strong> = millón
                </div>
              </div>

              {/* keypad */}
              <div className="grid grid-cols-3 gap-2 md:max-w-sm md:mx-auto md:w-full">
                {["1","2","3","4","5","6","7","8","9","k","0","⌫"].map(d => (
                  <button key={d} onClick={() => tap(d)}
                    className="py-4 rounded-card text-[20px] font-medium active:scale-95 transition-transform"
                    style={{background:"var(--color-bg-2)", border:"1px solid var(--color-hair)"}}>
                    {d === "⌫" ? <Icon name="del" size={18} className="mx-auto text-fg-2"/> : d}
                  </button>
                ))}
              </div>

              {/* merchant */}
              <div>
                <div className="mono text-[10px] mb-1.5" style={{color:"var(--color-fg-4)", letterSpacing:".1em"}}>
                  ¿DÓNDE? (OPCIONAL)
                </div>
                <input
                  value={merchant}
                  onChange={e => setMerchant(e.target.value)}
                  placeholder={kind === "income" ? "ej. Contrato portal alcaldía" : "ej. Domino's, Éxito…"}
                  style={{
                    background:"var(--color-bg-2)", border:"1px solid var(--color-hair)",
                    borderRadius:12, padding:"12px 14px", fontSize:14, color:"var(--color-fg)",
                    width:"100%", outline:"none", boxSizing:"border-box",
                  }}
                />
              </div>

              <button
                disabled={cents <= 0}
                onClick={goToStep2}
                className="py-4 rounded-card font-semibold text-bg-0 disabled:opacity-40 transition-opacity"
                style={{background:"linear-gradient(180deg, oklch(.93 .14 150), oklch(.78 .18 150))", boxShadow: cents > 0 ? "0 0 24px oklch(.85 .18 150 / .35)" : "none"}}>
                Siguiente · {cents > 0 ? fmtCOP(cents) : "ingresa monto"}
              </button>
            </motion.div>
          )}

          {/* ── STEP 2: Categoría ───────────────────────────────── */}
          {step === 2 && (
            <motion.div key="s2" initial={{opacity:0, x:24}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-24}}
              transition={{duration:.18}} className="flex flex-col gap-4">

              <div className="text-center">
                <div className="mono text-[11px] mb-1" style={{color:"var(--color-fg-3)"}}>
                  {kind === "income" ? "+" : "−"}{fmtCOP(cents)}{merchant && <> · <em style={{fontStyle:"normal"}}>{merchant}</em></>}
                </div>
                <div className="text-[16px] font-semibold">¿En qué categoría?</div>
              </div>

              {filteredCats.length === 0 ? (
                <Card>
                  <p style={{fontSize:13, color:"var(--color-fg-3)", textAlign:"center", padding:"8px 0"}}>
                    No tienes categorías de tipo {kind === "income" ? "ingreso" : "gasto"}.<br/>
                    Ve a Configuración → Categorías para agregar.
                  </p>
                </Card>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {filteredCats.map(c => (
                    <button key={c.id} onClick={() => selectCat(c.id)}
                      className="p-3 rounded-card text-left active:scale-95 transition-transform"
                      style={{
                        background: catId === c.id ? "oklch(.85 .18 150 / .12)" : "oklch(0.18 .007 250)",
                        border:"1px solid " + (catId === c.id ? "oklch(.85 .18 150 / .4)" : "var(--color-hair)"),
                      }}>
                      <div style={{fontSize:22}}>{c.emoji ?? "·"}</div>
                      <div style={{fontSize:11.5, fontWeight:500, marginTop:4, lineHeight:1.3}}>{c.name}</div>
                      {c.risk_tier === "danger" && <Pill kind="amber" className="mt-1.5" style={{fontSize:9}}>⚠ vigilar</Pill>}
                    </button>
                  ))}
                </div>
              )}

              <button onClick={skipCat}
                className="py-3 rounded-card text-[13px] font-medium"
                style={{
                  background:"transparent", border:"1px dashed var(--color-hair)",
                  color:"var(--color-fg-4)",
                }}>
                Continuar sin categoría →
              </button>
            </motion.div>
          )}

          {/* ── STEP 3: Clasificar + confirmar ──────────────────── */}
          {step === 3 && (
            <motion.div key="s3" initial={{opacity:0, x:24}} animate={{opacity:1, x:0}} exit={{opacity:0, x:-24}}
              transition={{duration:.18}} className="flex flex-col gap-4">

              {/* summary */}
              <div style={{
                background:"var(--color-bg-1)", border:"1px solid var(--color-hair)",
                borderRadius:14, padding:"14px 16px",
              }}>
                <div className="mono text-[10px] mb-2" style={{color:"var(--color-fg-4)", letterSpacing:".1em"}}>
                  RESUMEN
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <div className="mono font-medium" style={{fontSize:28, color: kind === "income" ? "var(--color-accent)" : "var(--color-fg)"}}>
                      {kind === "income" ? "+" : "−"}{fmtCOP(cents)}
                    </div>
                    {merchant && <div style={{fontSize:13, color:"var(--color-fg-2)", marginTop:2}}>{merchant}</div>}
                  </div>
                  {catId && (
                    <div style={{textAlign:"right"}}>
                      <div style={{fontSize:24}}>{categories.find(c => c.id === catId)?.emoji ?? "·"}</div>
                      <div style={{fontSize:11.5, color:"var(--color-fg-3)", marginTop:2}}>
                        {categories.find(c => c.id === catId)?.name}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {kind === "expense" && (
                <>
                  {/* need */}
                  <div>
                    <div className="mono text-[10px] mb-2" style={{color:"var(--color-fg-4)", letterSpacing:".1em"}}>
                      ¿NECESARIO O IMPULSO?
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <ChoiceBtn label="✅ Necesario" desc="Tenía que hacerlo"
                        sel={need === "necessary"} onClick={() => setNeed(n => n === "necessary" ? null : "necessary")}
                        color="var(--color-accent)"/>
                      <ChoiceBtn label="⚡ Impulso"   desc="Podía evitarlo"
                        sel={need === "impulse"}   onClick={() => setNeed(n => n === "impulse"   ? null : "impulse")}
                        color="var(--color-warn)"/>
                    </div>
                  </div>

                  {/* emotion before */}
                  <div>
                    <div className="mono text-[10px] mb-2" style={{color:"var(--color-fg-4)", letterSpacing:".1em"}}>
                      ¿CÓMO ESTABAS ANTES?
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {[["😌","tranquilo"],["😏","antojo"],["😩","estrés"],["🥺","triste"],["🤩","euforia"],["🥱","aburrido"]].map(([e,l]) => (
                        <button key={l} onClick={() => setEmoBefore(b => b === l ? null : l)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[12px] transition-all"
                          style={{
                            background: emoBefore === l ? "oklch(.82 .16 80 / .18)" : "var(--color-bg-2)",
                            border:"1px solid " + (emoBefore === l ? "oklch(.82 .16 80 / .5)" : "var(--color-hair)"),
                          }}>
                          <span>{e}</span><span style={{color: emoBefore === l ? "var(--color-warn)" : "var(--color-fg-3)"}}>{l}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* note */}
              <div>
                <div className="mono text-[10px] mb-1.5" style={{color:"var(--color-fg-4)", letterSpacing:".1em"}}>
                  NOTA (OPCIONAL)
                </div>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  placeholder="¿Algo que recordar sobre este movimiento?"
                  rows={2}
                  style={{
                    background:"var(--color-bg-2)", border:"1px solid var(--color-hair)",
                    borderRadius:12, padding:"10px 14px", fontSize:13.5, color:"var(--color-fg)",
                    width:"100%", outline:"none", boxSizing:"border-box", resize:"none",
                    fontFamily:"inherit",
                  }}
                />
              </div>

              <button disabled={pending} onClick={commit}
                className="py-4 rounded-card font-semibold text-bg-0 disabled:opacity-60 transition-opacity"
                style={{background:"linear-gradient(180deg, oklch(.93 .14 150), oklch(.78 .18 150))", boxShadow:"0 0 24px oklch(.85 .18 150 / .35)"}}>
                {pending ? "Guardando…" : `Confirmar ${kind === "income" ? "ingreso" : "gasto"} de ${fmtCOP(cents)}`}
              </button>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}

function ChoiceBtn({ label, desc, sel, onClick, color }: { label:string; desc:string; sel:boolean; onClick:()=>void; color:string }) {
  return (
    <button onClick={onClick}
      className="p-3.5 rounded-card text-left transition-all active:scale-95"
      style={{
        background: sel ? `color-mix(in oklch, ${color} 12%, transparent)` : "oklch(0.18 .007 250)",
        border:"1px solid " + (sel ? `color-mix(in oklch, ${color} 40%, transparent)` : "var(--color-hair)"),
        boxShadow: sel ? `0 0 18px color-mix(in oklch, ${color} 20%, transparent)` : "none",
      }}>
      <div style={{fontSize:13.5, fontWeight:600}}>{label}</div>
      <div style={{fontSize:11, color:"var(--color-fg-4)", marginTop:3}}>{desc}</div>
    </button>
  );
}
