/* BRAYAN OS · screens extra · Lock, Today, Fuga, CEO, Weekly, More */
const { useState: useStateX, useEffect: useEffectX, useMemo: useMemoX, useRef: useRefX } = React;
const B2 = window.BOS;
const IconX = window.Icon;

// ─────────────────────────── LOCK + AI BRIEFING ───────────────────────────
function LockScreen({ onUnlock, state, addBriefing }){
  const [briefing, setBriefing] = useStateX(null);
  const [busy, setBusy] = useStateX(false);
  const stab = useMemoX(()=>B2.computeStability(state), [state]);

  // Get last briefing or trigger one if first time
  useEffectX(()=>{
    const last = state.briefings.filter(b => b.kind !== 'user').slice(-1)[0];
    if (last) setBriefing(last);
  }, []);

  async function fetchBriefing(){
    setBusy(true);
    const todayEvents = B2.todaysEvents(state);
    const spent = B2.sumBy(todayEvents, e => e.kind === 'expense');
    const impulses = B2.monthsEvents(state).filter(e => e.need === 'impulse').length;
    const streaks = state.habits.map(h => ({ name: h.name, streak: B2.streakFor(state, h.id) }));
    const data = {
      stability: stab.score, pillars: stab.pillars,
      today_spend_cop: Math.round(spent/100),
      daily_limit_cop: Math.round(state.profile.dailyLimitCents/100),
      impulses_30d: impulses, habits: streaks,
      saved_so_far_cop: Math.round(B2.metaProgress(state)/100),
      meta_target_cop: Math.round(state.profile.metaTargetCents/100),
      total_events: state.events.length,
    };
    const prompt = `Eres BRAYAN OS Operator. Briefing matutino en es-CO, ≤80 palabras, directo, sin emojis, sin "¡bien hecho!". 1 frase de estado, 1-2 acciones con números, 1 riesgo. Si total_events=0, dile que registre su primer movimiento. Nunca inventes números.
Datos: ${JSON.stringify(data)}`;
    try {
      const text = await window.claude.complete(prompt);
      const msg = { id:'b-'+Date.now(), kind:'daily', content:text, createdAt:new Date().toISOString() };
      addBriefing(msg);
      setBriefing(msg);
    } catch(e){ console.error(e); }
    setBusy(false);
  }

  const now = new Date();
  const utc = now.getTime() + now.getTimezoneOffset()*60000;
  const bog = new Date(utc - 5*3600000);
  const time = `${bog.getHours()}:${String(bog.getMinutes()).padStart(2,'0')}`;
  const racha = B2.streakFor(state, 'h-dom');

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:100,
      background:'radial-gradient(120% 60% at 50% 0%, oklch(0.22 .03 250) 0%, oklch(0.08 .01 250) 60%), oklch(0.06 .005 250)',
      display:'flex', flexDirection:'column', justifyContent:'space-between',
      paddingTop:'max(env(safe-area-inset-top), 50px)'
    }}>
      <div style={{padding:'14px 24px', textAlign:'center'}}>
        <div className="mono" style={{fontSize:11.5, letterSpacing:'.18em', color:'var(--fg-3)'}}>{B2.fmtDateHeader().replace(' ·', ' ·')}</div>
        <div style={{fontSize:78, fontWeight:300, letterSpacing:'-.04em', marginTop:4, lineHeight:1, fontFamily:'var(--sans)'}}>{time}</div>
      </div>

      <div style={{padding:'0 16px', display:'flex', flexDirection:'column', gap:10}}>
        {/* Briefing card */}
        <div style={{
          background:'oklch(.85 .18 150 / .12)', border:'1px solid oklch(.85 .18 150 / .35)',
          borderRadius:18, padding:'14px 16px', backdropFilter:'blur(20px)'
        }}>
          <div className="row" style={{gap:10, marginBottom:8}}>
            <IconX name="ai" size={16} style={{color:'var(--accent)'}}/>
            <span className="mono" style={{fontSize:10.5, letterSpacing:'.14em', color:'var(--accent)'}}>BRAYAN OS · DAILY BRIEFING</span>
            <span className="mono" style={{marginLeft:'auto', fontSize:10, color:'var(--fg-4)'}}>{time}</span>
          </div>
          {briefing ? (
            <div style={{fontSize:14, lineHeight:1.45, fontWeight:500, whiteSpace:'pre-wrap'}}>{briefing.content}</div>
          ) : busy ? (
            <div className="pulse" style={{fontSize:13, color:'var(--fg-3)'}}>Operador pensando…</div>
          ) : (
            <>
              <div style={{fontSize:14, lineHeight:1.45, fontWeight:500}}>
                Buenos días, {state.profile.name}. {state.events.length === 0 ? 'Empieza registrando tu primer movimiento.' : `Sistema en ${stab.score}/100.`} {racha > 0 ? `Racha ${racha} activa.` : ''}
              </div>
              <button className="btn primary" style={{marginTop:12, width:'100%'}} onClick={fetchBriefing} disabled={busy}>
                <IconX name="ai" size={13}/> Generar briefing con IA
              </button>
            </>
          )}
          <div className="row" style={{gap:6, marginTop:12}}>
            <span className="chip green">PUNTAJE {stab.score}</span>
            {racha > 0 && <span className="chip blue">RACHA {racha}D</span>}
            {state.debts.filter(d=>d.active && d.dueAt).length > 0 && <span className="chip amber">{state.debts.filter(d=>d.active && d.dueAt).length} VENCIMIENTOS</span>}
          </div>
        </div>

        {/* Quick notifications */}
        {state.events.length > 0 && (
          <div style={{background:'oklch(0.16 .006 250 / .7)', border:'1px solid oklch(0.3 .008 250 / .6)', borderRadius:18, padding:'12px 14px', backdropFilter:'blur(20px)'}}>
            <div className="row" style={{gap:12}}>
              <div style={{width:30, height:30, borderRadius:9, background:'oklch(0.25 .008 250)', display:'grid', placeItems:'center'}}>
                <IconX name="wallet" size={16} style={{color:'var(--accent)'}}/>
              </div>
              <div className="grow">
                <div style={{fontSize:13, fontWeight:500}}>{state.events.length} eventos · 30 días</div>
                <div className="mono" style={{fontSize:11, color:'var(--fg-3)', marginTop:2}}>Tu sistema sabe lo que pasa</div>
              </div>
            </div>
          </div>
        )}

        {racha > 0 && (
          <div style={{background:'oklch(0.16 .006 250 / .7)', border:'1px solid oklch(0.3 .008 250 / .6)', borderRadius:18, padding:'12px 14px', backdropFilter:'blur(20px)'}}>
            <div className="row" style={{gap:12}}>
              <div style={{width:30, height:30, borderRadius:9, background:'oklch(0.25 .008 250)', display:'grid', placeItems:'center'}}>
                <IconX name="flame" size={16} style={{color:'var(--accent-2)'}}/>
              </div>
              <div className="grow">
                <div style={{fontSize:13, fontWeight:500}}>Racha disciplina · día {racha}</div>
                <div className="mono" style={{fontSize:11, color:'var(--fg-3)', marginTop:2}}>Cero domicilios</div>
              </div>
            </div>
          </div>
        )}
      </div>

      <button onClick={onUnlock} style={{
        margin:'0 24px max(env(safe-area-inset-bottom), 40px)',
        padding:'14px', borderRadius:99, background:'oklch(0.16 .006 250 / .8)', border:'1px solid oklch(0.3 .008 250 / .6)', backdropFilter:'blur(14px)', color:'var(--fg)',
        display:'flex', flexDirection:'column', alignItems:'center', gap:6, cursor:'pointer'
      }}>
        <IconX name="chev" size={20} style={{transform:'rotate(-90deg)', color:'var(--fg-3)'}}/>
        <div className="mono" style={{fontSize:10.5, letterSpacing:'.12em', color:'var(--fg-3)'}}>TOCA · ABRE OPERATOR</div>
      </button>
    </div>
  );
}

// ─────────────────────────── TODAY · feed cronológico ───────────────────────────
function TodayScreen({ state }){
  const today = B2.todaysEvents(state);
  const profile = state.profile;
  const spent = B2.sumBy(today, e => e.kind === 'expense');
  const income = B2.sumBy(today, e => e.kind === 'income');
  const protectedC = B2.sumBy(today, e => e.kind === 'block');
  const ratio = Math.min(100, (spent/profile.dailyLimitCents)*100);
  const catMap = useMemoX(()=>Object.fromEntries(state.categories.map(c=>[c.slug, c])), [state.categories]);
  const buckets = { morning:[], afternoon:[], night:[] };
  today.sort((a,b)=> new Date(b.occurredAt) - new Date(a.occurredAt))
       .forEach(e => buckets[B2.dayPart(e.occurredAt)].push(e));

  // bucket totals
  const bucketTotal = p => buckets[p].reduce((s,e)=> s + (e.kind === 'income' ? Number(e.amountCents) : -Number(e.amountCents)), 0);

  return (
    <>
      <window.BOS_Screens.TopBar title="Hoy" sub={B2.fmtDateHeader()}/>
      <div className="view">
        <div className="card glow slide" style={{overflow:'hidden', position:'relative'}}>
          <div style={{position:'absolute', right:-40, top:-40, width:160, height:160, background:'radial-gradient(circle, oklch(.85 .18 150 / .2), transparent 70%)', borderRadius:'50%'}}/>
          <div className="between" style={{alignItems:'flex-start', position:'relative'}}>
            <div>
              <div className="micro">GASTO DE HOY</div>
              <div className="mono" style={{fontSize:38, fontWeight:500, letterSpacing:'-.025em', marginTop:6, lineHeight:1}}>{B2.fmtCOP(spent)}</div>
              <div className="row" style={{gap:5, marginTop:6}}>
                <span className={"chip " + (ratio > 80 ? 'amber' : ratio > 50 ? 'blue' : 'green')}>
                  {ratio.toFixed(0)}% LÍMITE
                </span>
                <span className="mono" style={{fontSize:10.5, color:'var(--fg-3)'}}>· {today.length} mov.</span>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="micro">PROTEGIDO</div>
              <div className="mono" style={{fontSize:22, color:'var(--accent)', marginTop:6}}>{B2.fmtCOP(protectedC)}</div>
            </div>
          </div>
          <div style={{marginTop:14}}>
            <div className="between" style={{marginBottom:5}}>
              <span className="mono" style={{fontSize:9.5, color:'var(--fg-4)'}}>RITMO · LÍMITE {B2.fmtCOP(profile.dailyLimitCents)}</span>
              <span className="mono" style={{fontSize:10, color: ratio > 80 ? 'var(--warn)' : 'var(--accent)'}}>{ratio.toFixed(0)}%</span>
            </div>
            <div style={{position:'relative', height:6, borderRadius:99, background:'var(--bg-2)'}}>
              <div style={{height:'100%', width: Math.max(2, ratio)+'%', background:'linear-gradient(90deg, var(--accent), var(--accent-2))', borderRadius:99, boxShadow:'0 0 10px oklch(.85 .18 150 / .4)'}}/>
              <div style={{position:'absolute', left:`${Math.min(100, ratio)}%`, top:-4, width:2, height:14, background:'var(--fg)', borderRadius:2, transform:'translateX(-50%)'}}/>
            </div>
          </div>
        </div>

        {/* Buckets */}
        {today.length === 0 ? (
          <div className="card empty">
            <div className="micro">SIN MOVIMIENTOS HOY</div>
            <div style={{marginTop:10, fontSize:13, color:'var(--fg-3)'}}>Toca el botón verde para registrar el primero.</div>
          </div>
        ) : (
          ['morning','afternoon','night'].map(p => buckets[p].length > 0 && (
            <section key={p}>
              <div className="between" style={{padding:'4px 4px'}}>
                <span className="micro">{p === 'morning' ? 'MAÑANA · 6–12H' : p === 'afternoon' ? 'TARDE · 12–18H' : 'NOCHE · 18–24H'}</span>
                <span className="mono" style={{fontSize:10, color: bucketTotal(p) >= 0 ? 'var(--accent)' : 'var(--fg-4)'}}>
                  {bucketTotal(p) >= 0 ? '+' : ''}{B2.fmtCOP(bucketTotal(p))}
                </span>
              </div>
              <div className="stack" style={{gap:6}}>
                {buckets[p].map(ev => {
                  const c = catMap[ev.categorySlug] ?? { emoji:'·', name:'Sin categoría' };
                  const isPos = ev.kind === 'income' || ev.kind === 'block';
                  return (
                    <div key={ev.id} className="tx-row">
                      <div className="tx-emj">{c.emoji}</div>
                      <div className="grow">
                        <div className="truncate" style={{fontSize:13.5, fontWeight:500}}>{ev.merchant || c.name}</div>
                        <div className="row" style={{gap:6, marginTop:3, flexWrap:'wrap'}}>
                          <span className="mono" style={{fontSize:10, color:'var(--fg-4)'}}>{B2.fmtTime(ev.occurredAt)}</span>
                          {ev.need && ev.need !== 'planned' && (
                            <span className={"chip " + (ev.need === 'impulse' ? 'amber' : ev.need === 'protected' ? 'green' : '')}>{ev.need}</span>
                          )}
                          {ev.emotionAfter && <span className="mono" style={{fontSize:11}}>{['😟','😕','😐','🙂','😄'][ev.emotionAfter-1]}</span>}
                        </div>
                      </div>
                      <span className="mono tx-amt" style={{color: isPos ? 'var(--accent)' : ev.need === 'impulse' ? 'var(--warn)' : 'var(--fg)'}}>
                        {isPos ? '+' : '−'}{B2.fmtCOP(ev.amountCents)}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          ))
        )}

        {/* Summary footer */}
        <div className="card">
          <div style={{display:'grid', gridTemplateColumns:'1fr 1px 1fr 1px 1fr'}}>
            <div style={{textAlign:'center', padding:'4px 8px'}}>
              <div className="micro" style={{fontSize:9}}>INGRESOS</div>
              <div className="mono" style={{fontSize:14, fontWeight:500, marginTop:4, color:'var(--accent)'}}>{B2.fmtCOP(income)}</div>
            </div>
            <div style={{background:'var(--hair)'}}/>
            <div style={{textAlign:'center', padding:'4px 8px'}}>
              <div className="micro" style={{fontSize:9}}>EGRESOS</div>
              <div className="mono" style={{fontSize:14, fontWeight:500, marginTop:4}}>{B2.fmtCOP(spent)}</div>
            </div>
            <div style={{background:'var(--hair)'}}/>
            <div style={{textAlign:'center', padding:'4px 8px'}}>
              <div className="micro" style={{fontSize:9}}>NETO</div>
              <div className="mono" style={{fontSize:14, fontWeight:500, marginTop:4, color: income-spent >= 0 ? 'var(--accent)' : 'var(--danger)'}}>
                {income-spent >= 0 ? '+' : ''}{B2.fmtCOP(income-spent)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────── ANTI-FUGA · índice ───────────────────────────
function FugaScreen({ state }){
  const month = B2.monthsEvents(state);
  const stab = B2.computeStability(state);
  const fugaIdx = Math.round(100 - stab.pillars.antifuga); // higher = more fuga
  const dangerCats = state.categories.filter(c => c.risk === 'danger');

  // category breakdown vs last 30 days
  const catBreakdown = useMemoX(()=>{
    return state.categories.filter(c => c.kind === 'expense').map(c => {
      const spent = B2.sumBy(month, e => e.kind === 'expense' && e.categorySlug === c.slug);
      // simulate prev period
      const prev30 = state.events.filter(e => {
        const d = B2.daysBetween(e.occurredAt, new Date());
        return d > 30 && d <= 60 && e.kind === 'expense' && e.categorySlug === c.slug;
      });
      const prevSpent = B2.sumBy(prev30, ()=>true);
      const delta = prevSpent > 0 ? Math.round(((spent - prevSpent)/prevSpent)*100) : 0;
      const daysSince = state.events
        .filter(e => e.kind === 'expense' && e.categorySlug === c.slug)
        .sort((a,b)=> new Date(b.occurredAt) - new Date(a.occurredAt))[0];
      const days = daysSince ? B2.daysBetween(daysSince.occurredAt, new Date()) : 999;
      return { cat: c, spent, delta, days };
    }).filter(x => x.spent > 0 || x.cat.risk !== 'safe').sort((a,b) => b.spent - a.spent);
  }, [state]);

  return (
    <>
      <window.BOS_Screens.TopBar title="Anti-fuga" sub="ÍNDICE · MAYO" right={<span className={"chip " + (fugaIdx > 60 ? 'red' : fugaIdx > 35 ? 'amber' : 'green')}>{fugaIdx > 60 ? 'PELIGRO' : fugaIdx > 35 ? 'VIGILANCIA' : 'ESTABLE'}</span>}/>
      <div className="view">
        {/* Hero */}
        <div className="card glow slide" style={{overflow:'hidden', position:'relative'}}>
          <div style={{position:'absolute', right:-50, top:-50, width:220, height:220, background:`radial-gradient(circle, oklch(.82 .16 80 / .18), transparent 70%)`, borderRadius:'50%'}}/>
          <div className="row" style={{gap:14, position:'relative'}}>
            <FugaDial pct={fugaIdx}/>
            <div className="grow">
              <div className="micro">ÍNDICE DE FUGA</div>
              <div className="mono" style={{fontSize:36, fontWeight:500, marginTop:6, lineHeight:1, color: fugaIdx > 60 ? 'var(--danger)' : fugaIdx > 35 ? 'var(--warn)' : 'var(--accent)'}}>
                {fugaIdx}<span style={{fontSize:14, color:'var(--fg-4)'}}>/100</span>
              </div>
              <div className="mono" style={{fontSize:11, color:'var(--fg-3)', marginTop:8}}>
                {fugaIdx > 60 ? <>Zona roja. Cortar fugas ya.</>
                : fugaIdx > 35 ? <>Zona <b style={{color:'var(--warn)'}}>amarilla</b>. Vigilar.</>
                : <>Sistema <b style={{color:'var(--accent)'}}>estable</b>. Mantén el ritmo.</>}
              </div>
            </div>
          </div>
          <div className="stack" style={{gap:6, marginTop:14}}>
            <SmallSignalX ok={B2.daysSinceLastImpulse(state) >= 7} txt={`${B2.daysSinceLastImpulse(state) >= 999 ? 'Sin impulsos registrados' : B2.daysSinceLastImpulse(state) + ' días sin impulsivos'}`}/>
            {catBreakdown.slice(0,2).map((x,i)=>(
              <SmallSignalX key={i} ok={x.delta <= 0} txt={`${x.cat.name} ${x.delta > 0 ? '↑' : '↓'} ${Math.abs(x.delta || 0)}% vs mes ant.`}/>
            ))}
          </div>
        </div>

        {/* Categorías */}
        <section>
          <div className="between" style={{padding:'4px 4px 10px'}}>
            <span className="micro">CATEGORÍAS · PELIGROSAS PRIMERO</span>
          </div>
          <div className="stack" style={{gap:8}}>
            {catBreakdown.map(({cat, spent, delta, days}, i)=>(
              <CatRowX key={i} cat={cat} spent={spent} delta={delta} days={days}/>
            ))}
            {catBreakdown.length === 0 && (
              <div className="card empty">
                <div className="micro">SIN DATOS AÚN</div>
                <div style={{marginTop:10, fontSize:13, color:'var(--fg-3)'}}>Empieza a registrar gastos para ver el desglose.</div>
              </div>
            )}
          </div>
        </section>

        {/* Modo blindaje */}
        <div className="card">
          <div className="row" style={{gap:12}}>
            <div style={{width:38, height:38, borderRadius:11, background:'oklch(.85 .18 150 / .15)', border:'1px solid oklch(.85 .18 150 / .3)', color:'var(--accent)', display:'grid', placeItems:'center', flex:'none'}}>
              <IconX name="shield" size={18}/>
            </div>
            <div className="grow">
              <div style={{fontSize:13.5, fontWeight:600}}>Modo blindaje</div>
              <div className="mono" style={{fontSize:11, color:'var(--fg-4)', marginTop:2}}>Recordatorio para evitar delivery 12–22h</div>
            </div>
            <ToggleX/>
          </div>
        </div>
      </div>
    </>
  );
}

function FugaDial({ pct }){
  const r = 32, c = 2*Math.PI*r;
  const col = pct > 60 ? 'var(--danger)' : pct > 35 ? 'var(--warn)' : 'var(--accent)';
  return (
    <svg width={84} height={84} viewBox="0 0 84 84">
      <circle cx="42" cy="42" r={r} stroke="var(--bg-2)" strokeWidth="7" fill="none"/>
      <circle cx="42" cy="42" r={r} stroke={col} strokeWidth="7" fill="none"
        strokeDasharray={c} strokeDashoffset={c - (pct/100)*c} strokeLinecap="round"
        transform="rotate(-90 42 42)" style={{filter:`drop-shadow(0 0 4px ${col})`}}/>
      <text x="42" y="46" fontFamily="var(--mono)" fontSize="18" fontWeight="500" textAnchor="middle" fill="var(--fg)">{pct}</text>
    </svg>
  );
}
function SmallSignalX({ ok, txt }){
  const c = ok ? 'var(--accent)' : 'var(--warn)';
  return (
    <div className="row" style={{gap:8}}>
      <span style={{width:6, height:6, borderRadius:50, background:c, boxShadow:`0 0 6px ${c}`, flex:'none'}}/>
      <span style={{fontSize:12.5, color:'var(--fg-2)'}}>{txt}</span>
    </div>
  );
}
function CatRowX({ cat, spent, delta, days }){
  const max = 500_00000; // 500K
  const pct = Math.min(100, (spent/max)*100);
  const col = cat.risk === 'danger' ? 'var(--danger)' : cat.risk === 'watch' ? 'var(--warn)' : 'var(--accent-2)';
  return (
    <div style={{background:'linear-gradient(180deg, oklch(0.19 .007 250) 0%, oklch(0.16 .006 250) 100%)', border:'1px solid var(--hair)', borderRadius:14, padding:'12px 14px'}}>
      <div className="row" style={{gap:12}}>
        <div style={{width:36, height:36, borderRadius:10, background:'var(--bg-2)', border:'1px solid var(--hair)', display:'grid', placeItems:'center', fontSize:18, flex:'none'}}>{cat.emoji}</div>
        <div className="grow">
          <div className="between" style={{alignItems:'baseline'}}>
            <span style={{fontSize:13.5, fontWeight:500}}>{cat.name}</span>
            <span className="mono" style={{fontSize:13, fontWeight:500, color: spent > 0 ? col : 'var(--fg-4)'}}>{B2.fmtCOP(spent)}</span>
          </div>
          <div className="row" style={{gap:6, marginTop:3}}>
            {delta !== 0 ? (
              <span className="mono" style={{fontSize:10, color: delta > 0 ? 'var(--danger)' : 'var(--accent)'}}>
                {delta > 0 ? '↑ +' : '↓ '}{Math.abs(delta)}% vs mes ant.
              </span>
            ) : (
              <span className="mono" style={{fontSize:10, color:'var(--fg-4)'}}>sin cambio</span>
            )}
            {days < 999 && days > 0 && (
              <span className="mono" style={{marginLeft:'auto', fontSize:10, color:'var(--accent)'}}>● {days}d sin recaída</span>
            )}
          </div>
        </div>
      </div>
      <div style={{marginTop:10}}>
        <div style={{height:4, borderRadius:99, background:'var(--bg-2)', overflow:'hidden'}}>
          <div style={{height:'100%', width:Math.max(2, pct)+'%', background:col, borderRadius:99}}/>
        </div>
      </div>
    </div>
  );
}
function ToggleX(){
  const [on, setOn] = useStateX(false);
  return (
    <button onClick={()=>setOn(!on)} style={{
      width:42, height:24, borderRadius:99, padding:2, display:'inline-flex', alignItems:'center',
      background: on ? 'oklch(.85 .18 150 / .3)' : 'var(--bg-2)',
      border:'1px solid ' + (on ? 'oklch(.85 .18 150 / .6)' : 'var(--hair)'),
      flex:'none', cursor:'pointer'
    }}>
      <span style={{width:18, height:18, borderRadius:50, background: on ? 'var(--accent)' : 'var(--fg-4)', marginLeft: on?16:0, transition:'.15s', boxShadow: on ? '0 0 8px var(--accent)' : 'none'}}/>
    </button>
  );
}

// ─────────────────────────── CEO MODE ───────────────────────────
function CeoScreen({ state, updateProject }){
  const projects = state.projects || [];
  const totalPipeline = projects.reduce((s,p)=> s + Number(p.valueCents || 0), 0);
  const won = projects.filter(p => p.stage === 'won').reduce((s,p)=> s + Number(p.valueCents || 0), 0);
  const closeRate = projects.length ? Math.round((projects.filter(p=>p.stage==='won').length / projects.length)*100) : 0;
  const stages = [
    { key:'lead',      label:'Lead',     col:'oklch(0.3 .008 250)' },
    { key:'discovery', label:'Disc.',    col:'oklch(0.4 .04 250)' },
    { key:'proposal',  label:'Prop.',    col:'oklch(0.72 .17 250)' },
    { key:'active',    label:'Curso',    col:'oklch(.85 .18 150)' },
    { key:'won',       label:'Cierre',   col:'oklch(.93 .14 150)' },
  ];
  const stageCounts = stages.map(s => ({ ...s, n: projects.filter(p => p.stage === s.key).length, val: projects.filter(p => p.stage === s.key).reduce((sum,p)=>sum + Number(p.valueCents||0), 0) }));

  return (
    <>
      <window.BOS_Screens.TopBar title="CEO Mode" sub="OPERACIONES · MAY"/>
      <div className="view">
        {/* Hero */}
        <div className="card glow slide">
          <div className="between" style={{alignItems:'flex-start'}}>
            <div>
              <div className="micro">PIPELINE ACTIVO</div>
              <div className="mono" style={{fontSize:34, fontWeight:500, letterSpacing:'-.02em', marginTop:6, lineHeight:1}}>{B2.fmtCOP(totalPipeline)}</div>
              <div className="row" style={{gap:6, marginTop:6}}>
                <span className="chip blue">{projects.length} PROYECTOS</span>
                <span className="mono" style={{fontSize:11, color:'var(--fg-3)'}}>{closeRate}% close rate</span>
              </div>
            </div>
            <div style={{textAlign:'right'}}>
              <div className="micro" style={{fontSize:9}}>WEIGHTED · 90D</div>
              <div className="mono" style={{fontSize:18, color:'var(--accent)', marginTop:6}}>{B2.fmtCOP(totalPipeline * 0.4)}</div>
            </div>
          </div>
          <div style={{marginTop:14}}>
            <div style={{display:'flex', height:10, borderRadius:6, overflow:'hidden', border:'1px solid var(--hair)'}}>
              {stageCounts.map(s => (
                <div key={s.key} style={{flex: s.val || 1, background: s.col}}/>
              ))}
            </div>
            <div className="between" style={{marginTop:6, fontFamily:'var(--mono)', fontSize:9.5, color:'var(--fg-4)'}}>
              {stageCounts.map(s => <span key={s.key}>{s.label} {s.n}</span>)}
            </div>
          </div>
        </div>

        {/* Stats grid */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
          <MiniStatX lbl="MRR PROY." v="$2.1M" delta="+12%"/>
          <MiniStatX lbl="CIERRE" v={`${closeRate}%`} delta="+6%"/>
          <MiniStatX lbl="AUTO HRS" v="25h/m" delta="+18%" accent/>
        </div>

        {/* Projects */}
        <section>
          <div className="between" style={{padding:'4px 4px 10px'}}>
            <span className="micro">PROYECTOS ACTIVOS</span>
            <span className="mono" style={{fontSize:10.5, color:'var(--fg-4)'}}>TAP · CAMBIAR STAGE</span>
          </div>
          <div className="stack" style={{gap:8}}>
            {projects.map(p => (
              <ProjectCard key={p.id} p={p} stages={stages} onCycle={() => {
                const idx = stages.findIndex(s => s.key === p.stage);
                const next = stages[(idx+1) % stages.length].key;
                updateProject(p.id, { stage: next });
              }}/>
            ))}
            {projects.length === 0 && (
              <div className="card empty">
                <div className="micro">SIN PROYECTOS</div>
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}

function ProjectCard({ p, stages, onCycle }){
  const stage = stages.find(s => s.key === p.stage) ?? stages[0];
  const kind = p.stage === 'active' || p.stage === 'won' ? 'green' : p.stage === 'proposal' ? 'blue' : p.stage === 'paused' ? 'amber' : 'plain';
  return (
    <div className="card" onClick={onCycle} style={{cursor:'pointer', padding:14}}>
      <div className="between" style={{marginBottom:8}}>
        <div className="row" style={{gap:8}}>
          <span className="mono" style={{fontSize:10, color:'var(--fg-4)'}}>{p.code}</span>
          <span className={"chip " + kind}>{stage.label.toUpperCase()}</span>
        </div>
        <span className="mono" style={{fontSize:14, fontWeight:500}}>{B2.fmtCOP(Number(p.valueCents))}</span>
      </div>
      <div style={{fontSize:13.5, fontWeight:600, letterSpacing:'-.005em'}}>{p.name}</div>
      <div className="mono" style={{fontSize:10.5, color:'var(--fg-4)', marginTop:2}}>{p.client} · entrega {p.deadline}</div>
      <div className="row" style={{gap:10, marginTop:10}}>
        <div className="bar" style={{flex:1, height:4}}><i style={{width:p.progress+'%'}}/></div>
        <span className="mono" style={{fontSize:11, color:'var(--fg-3)', minWidth:32, textAlign:'right'}}>{p.progress}%</span>
      </div>
    </div>
  );
}
function MiniStatX({ lbl, v, delta, accent }){
  return (
    <div className="card" style={{padding:10}}>
      <div className="micro" style={{fontSize:9}}>{lbl}</div>
      <div className="mono" style={{fontSize:16, fontWeight:500, marginTop:4, color: accent ? 'var(--accent)' : 'var(--fg)'}}>{v}</div>
      {delta && <div className="mono" style={{fontSize:9.5, color: delta.startsWith('+') ? 'var(--accent)' : 'var(--danger)', marginTop:2}}>{delta}</div>}
    </div>
  );
}

// ─────────────────────────── WEEKLY REVIEW · story flow ───────────────────────────
function WeeklyScreen({ state, saveReview }){
  const [step, setStep] = useStateX(0);
  const [reflection, setReflection] = useStateX('');
  const [word, setWord] = useStateX('');
  const [commitments, setCommitments] = useStateX(['', '', '']);

  const stab = B2.computeStability(state);
  const weekEvs = B2.weeksEvents(state);
  const monthEvs = B2.monthsEvents(state);
  const wins = useMemoX(()=>{
    const out = [];
    const noImpulse = weekEvs.filter(e => e.kind === 'expense' && e.need !== 'impulse').length;
    const impulses = weekEvs.filter(e => e.need === 'impulse').length;
    if (impulses === 0 && noImpulse > 0) out.push(`${noImpulse} gastos esta semana, cero impulsivos`);
    const habits = state.habits.map(h => ({ h, hits: 0 }));
    for (let i = 0; i < 7; i++){
      const d = B2.localDay(B2.addDays(new Date(), -i));
      habits.forEach(x => { if (state.habitHits[`${d}::${x.h.id}`]) x.hits++; });
    }
    habits.filter(x => x.hits >= 5).forEach(x => out.push(`${x.h.name} · ${x.hits} de 7 días`));
    const saved = B2.sumBy(weekEvs, e => e.kind === 'income') - B2.sumBy(weekEvs, e => e.kind === 'expense');
    if (saved > 0) out.push(`${B2.fmtCOP(saved)} ahorrados esta semana`);
    return out.slice(0, 4);
  }, [state]);
  const misses = useMemoX(()=>{
    const out = [];
    const impulses = weekEvs.filter(e => e.need === 'impulse');
    if (impulses.length > 0){
      const total = impulses.reduce((s,e)=>s+Number(e.amountCents), 0);
      out.push(`${impulses.length} impulsos esta semana · ${B2.fmtCOP(total)}`);
    }
    const habits = state.habits.map(h => ({ h, hits: 0 }));
    for (let i = 0; i < 7; i++){
      const d = B2.localDay(B2.addDays(new Date(), -i));
      habits.forEach(x => { if (state.habitHits[`${d}::${x.h.id}`]) x.hits++; });
    }
    habits.filter(x => x.hits <= 2).forEach(x => out.push(`${x.h.name} · solo ${x.hits} de 7 días`));
    return out.slice(0, 3);
  }, [state]);
  const protectedThisWeek = B2.sumBy(weekEvs, e => e.kind === 'block');
  const totalSteps = 6;

  function next(){ setStep(s => Math.min(totalSteps-1, s+1)); }
  function prev(){ setStep(s => Math.max(0, s-1)); }
  function finish(){
    saveReview({
      id:'r-'+Date.now(),
      weekStart: B2.localDay(B2.addDays(new Date(), -6)),
      reflection, word, commitments: commitments.filter(c=>c.trim()),
      stability: stab.score,
      closedAt: new Date().toISOString(),
    });
    setStep(0);
  }

  return (
    <>
      <window.BOS_Screens.TopBar title="Weekly Review" sub={`SEMANA · ${B2.fmtDateHeader().split('·')[1]?.trim()}`}
        right={<span className="mono" style={{fontSize:10.5, color:'var(--fg-3)', letterSpacing:'.1em'}}>{step+1}/{totalSteps}</span>}
      />
      <div style={{display:'flex', gap:4, padding:'0 16px 14px'}}>
        {Array.from({length:totalSteps}).map((_,i) => (
          <div key={i} style={{flex:1, height:3, borderRadius:99, background: i <= step ? 'var(--accent)' : 'var(--bg-2)', boxShadow: i === step ? '0 0 8px var(--accent)' : 'none'}}/>
        ))}
      </div>
      <div className="view">
        {step === 0 && (
          <div className="card glow slide" style={{padding:'24px 20px', minHeight:300, position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', right:-50, top:-50, width:220, height:220, background:'radial-gradient(circle, oklch(.85 .18 150 / .25), transparent 70%)', borderRadius:'50%'}}/>
            <div style={{position:'relative'}}>
              <div className="micro">01 / 06 · ESTADO DE LA SEMANA</div>
              <div style={{fontSize:24, fontWeight:600, letterSpacing:'-.02em', marginTop:14, lineHeight:1.2}}>
                Stability cerró en <span style={{color:'var(--accent)'}}>{stab.score}/100</span>.
              </div>
              <div className="mono" style={{fontSize:13, color:'var(--fg-3)', marginTop:10}}>{weekEvs.length} eventos · {monthEvs.length} en 30d</div>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginTop:18}}>
                <BigMetric lbl="CAPITAL" v={stab.pillars.capital} accent/>
                <BigMetric lbl="DISCIPLINA" v={stab.pillars.discipline}/>
                <BigMetric lbl="ANTI-FUGA" v={stab.pillars.antifuga}/>
                <BigMetric lbl="EVENTOS" v={weekEvs.length}/>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="card glow slide" style={{padding:'24px 20px', minHeight:300}}>
            <div className="micro">02 / 06 · LO QUE FUNCIONÓ</div>
            <div className="stack" style={{gap:10, marginTop:14}}>
              {wins.length > 0 ? wins.map((w,i)=>(
                <div key={i} className="row" style={{gap:10}}>
                  <span style={{width:18, height:18, borderRadius:5, background:'var(--accent)', display:'grid', placeItems:'center', color:'#06120c', flex:'none'}}>
                    <IconX name="check" size={11} stroke={2.6}/>
                  </span>
                  <span style={{fontSize:13.5}}>{w}</span>
                </div>
              )) : <div style={{fontSize:13, color:'var(--fg-3)'}}>Sin victorias detectadas. Empieza a registrar más esta semana.</div>}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="card glow slide" style={{padding:'24px 20px', minHeight:300}}>
            <div className="micro">03 / 06 · LO QUE SLIPPED</div>
            <div className="stack" style={{gap:10, marginTop:14}}>
              {misses.length > 0 ? misses.map((m,i)=>(
                <div key={i} className="row" style={{gap:10}}>
                  <span style={{width:18, height:18, borderRadius:5, background:'transparent', border:'1px solid var(--warn)', display:'grid', placeItems:'center', color:'var(--warn)', flex:'none'}}>
                    <span style={{fontFamily:'var(--mono)', fontSize:11}}>!</span>
                  </span>
                  <span style={{fontSize:13.5}}>{m}</span>
                </div>
              )) : <div style={{fontSize:13, color:'var(--accent)'}}>Sin slips detectados. Semana limpia.</div>}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="card glow slide" style={{padding:'24px 20px', minHeight:300, position:'relative', overflow:'hidden'}}>
            <div style={{position:'absolute', inset:0, background:'radial-gradient(circle at 50% 30%, oklch(.85 .18 150 / .18), transparent 60%)', pointerEvents:'none'}}/>
            <div style={{position:'relative', textAlign:'center'}}>
              <div className="micro">04 / 06 · EL NÚMERO</div>
              <div className="mono" style={{fontSize:64, fontWeight:300, color:'var(--accent)', marginTop:14, lineHeight:1, letterSpacing:'-.03em'}}>{B2.fmtCOP(protectedThisWeek)}</div>
              <div style={{fontSize:14, color:'var(--fg-2)', marginTop:6}}>protegidos esta semana</div>
              <div className="mono" style={{fontSize:11, color:'var(--fg-4)', marginTop:14}}>"Los pequeños sí cuentan. Especialmente cuando suman."</div>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="card glow slide" style={{padding:'24px 20px'}}>
            <div className="micro">05 / 06 · REFLEXIÓN</div>
            <div style={{fontSize:13, color:'var(--fg-3)', marginTop:6}}>¿Cómo te sentiste esta semana? Una palabra basta.</div>
            <input className="input" style={{marginTop:14, fontFamily:'var(--sans)', fontSize:18, textAlign:'center'}} placeholder="protección · disciplina · caos…" value={word} onChange={e=>setWord(e.target.value)}/>
            <textarea className="input" rows={4} style={{marginTop:10, fontFamily:'var(--sans)', fontSize:13, resize:'none'}} placeholder="Una frase honesta…" value={reflection} onChange={e=>setReflection(e.target.value)}/>
          </div>
        )}

        {step === 5 && (
          <div className="card glow slide" style={{padding:'24px 20px'}}>
            <div className="micro">06 / 06 · COMPROMISOS · SEM SIG.</div>
            <div className="stack" style={{gap:8, marginTop:14}}>
              {commitments.map((c,i)=>(
                <div key={i} className="row" style={{gap:10}}>
                  <span className="mono" style={{fontSize:11, color:'var(--fg-4)', width:24}}>0{i+1}</span>
                  <input className="input" style={{fontFamily:'var(--sans)', fontSize:13}} placeholder={`Compromiso ${i+1}`} value={c} onChange={e=>{
                    const nx = [...commitments]; nx[i] = e.target.value; setCommitments(nx);
                  }}/>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="row" style={{gap:8, marginTop:8}}>
          {step > 0 && <button className="btn" onClick={prev} style={{flex:1}}>← Atrás</button>}
          {step < totalSteps-1 ? (
            <button className="btn primary" onClick={next} style={{flex:2}}>Siguiente →</button>
          ) : (
            <button className="btn primary" onClick={finish} style={{flex:2}}>
              <IconX name="check" size={14}/> Cerrar semana
            </button>
          )}
        </div>

        {state.reviews && state.reviews.length > 0 && step === 0 && (
          <section>
            <div className="micro" style={{padding:'4px 4px 10px'}}>REVIEWS PASADAS</div>
            <div className="stack" style={{gap:8}}>
              {state.reviews.slice(-3).reverse().map(r => (
                <div key={r.id} className="card" style={{padding:12}}>
                  <div className="between">
                    <span className="mono" style={{fontSize:11}}>{r.weekStart}</span>
                    <span className="chip green">{r.stability}/100</span>
                  </div>
                  {r.word && <div style={{fontSize:14, marginTop:6, fontWeight:600, color:'var(--accent)'}}>{r.word.toUpperCase()}</div>}
                  {r.reflection && <div style={{fontSize:12.5, color:'var(--fg-2)', marginTop:4, fontStyle:'italic'}}>"{r.reflection}"</div>}
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </>
  );
}

function BigMetric({ lbl, v, accent }){
  return (
    <div>
      <div className="micro">{lbl}</div>
      <div className="mono" style={{fontSize:24, fontWeight:500, marginTop:6, color: accent ? 'var(--accent)' : 'var(--fg)'}}>{v}</div>
    </div>
  );
}

// ─────────────────────────── MORE · menu hub ───────────────────────────
function MoreScreen({ go, showLock }){
  const items = [
    { id:'today',    icon:'cal',    label:'Today',         sub:'Feed cronológico del día',   color:'var(--accent)' },
    { id:'fuga',     icon:'shield', label:'Anti-fuga',     sub:'Índice de fuga · categorías',color:'var(--warn)' },
    { id:'ceo',      icon:'brief',  label:'CEO Mode',      sub:'Proyectos · pipeline',       color:'var(--accent-2)' },
    { id:'review',   icon:'cal',    label:'Weekly Review', sub:'Cierre semanal · 6 pasos',   color:'var(--accent-2)' },
    { id:'operator', icon:'ai',     label:'AI Operator',   sub:'Chat con tu operador IA',    color:'var(--accent)' },
    { id:'settings', icon:'cog',    label:'Settings',      sub:'Datos · perfil · export',    color:'var(--fg-3)' },
  ];
  return (
    <>
      <window.BOS_Screens.TopBar title="Más" sub="ENTRADAS · ACCESO RÁPIDO"/>
      <div className="view">
        <div className="card glow" onClick={showLock} style={{cursor:'pointer'}}>
          <div className="row" style={{gap:14}}>
            <div style={{width:44, height:44, borderRadius:12, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', display:'grid', placeItems:'center', color:'#06120c', flex:'none', boxShadow:'0 0 20px oklch(.85 .18 150 / .4)'}}>
              <IconX name="ai" size={20} stroke={2}/>
            </div>
            <div className="grow">
              <div style={{fontSize:14, fontWeight:600}}>Daily Briefing</div>
              <div className="mono" style={{fontSize:11, color:'var(--fg-4)', marginTop:2}}>Pantalla de bloqueo + briefing IA</div>
            </div>
            <IconX name="chev" size={14} style={{color:'var(--fg-3)'}}/>
          </div>
        </div>

        <div className="stack" style={{gap:8}}>
          {items.map(it => (
            <div key={it.id} className="card" onClick={()=>go(it.id)} style={{cursor:'pointer', padding:14}}>
              <div className="row" style={{gap:14}}>
                <div style={{width:38, height:38, borderRadius:11, background:'var(--bg-2)', border:'1px solid var(--hair)', display:'grid', placeItems:'center', flex:'none', color: it.color}}>
                  <IconX name={it.icon} size={18}/>
                </div>
                <div className="grow">
                  <div style={{fontSize:13.5, fontWeight:600}}>{it.label}</div>
                  <div className="mono" style={{fontSize:11, color:'var(--fg-4)', marginTop:2}}>{it.sub}</div>
                </div>
                <IconX name="chev" size={14} style={{color:'var(--fg-4)'}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

window.BOS_Extra = { LockScreen, TodayScreen, FugaScreen, CeoScreen, WeeklyScreen, MoreScreen };
