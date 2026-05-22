/* BRAYAN OS · screens — visual fidelity al mobile mockup */
const { useState, useEffect, useMemo, useRef } = React;
const B = window.BOS;
const Icon = window.Icon;

// ─────────────────────────── helpers ───────────────────────────
function TopBar({ title, sub, left, right, withBorder }){
  return (
    <div className={"topbar" + (withBorder ? ' with-border' : '')}>
      <div className="row" style={{gap:10}}>
        {left ?? <div className="logo"/>}
        <div className="stack">
          <div style={{fontSize:14.5, fontWeight:600, letterSpacing:'-.01em'}}>{title}</div>
          {sub && <div className="micro" style={{marginTop:1}}>{sub}</div>}
        </div>
      </div>
      <div className="row" style={{gap:6}}>{right}</div>
    </div>
  );
}

function Ring({ pct, size=96, stroke=7, color='var(--accent)' }){
  const r = (size-stroke)/2;
  const c = 2*Math.PI*r;
  const off = c - (B.clamp(pct)/100)*c;
  return (
    <svg width={size} height={size}>
      <circle cx={size/2} cy={size/2} r={r} stroke="var(--bg-2)" strokeWidth={stroke} fill="none"/>
      <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={stroke} fill="none"
        strokeDasharray={c} strokeDashoffset={off} strokeLinecap="round"
        transform={`rotate(-90 ${size/2} ${size/2})`}
        style={{filter:`drop-shadow(0 0 6px ${color})`, transition:'stroke-dashoffset .5s ease'}}/>
    </svg>
  );
}

function Pillar({ lbl, v }){
  const col = v >= 70 ? 'var(--accent)' : v >= 50 ? 'var(--warn)' : v >= 30 ? 'var(--warn)' : 'var(--danger)';
  const grade = v >= 90 ? 'A+' : v >= 80 ? 'A' : v >= 70 ? 'A−' : v >= 60 ? 'B+' : v >= 50 ? 'B' : v >= 40 ? 'C+' : v >= 30 ? 'C' : 'D';
  return (
    <div style={{background:'var(--bg-1)', borderRadius:10, padding:'8px 10px', border:'1px solid var(--hair)'}}>
      <div className="micro" style={{fontSize:9, letterSpacing:'.12em'}}>{lbl}</div>
      <div className="mono" style={{fontSize:18, fontWeight:500, marginTop:2, color: col}}>{grade}</div>
    </div>
  );
}

function Sparkline({ data, h=50, color='var(--accent)' }){
  if (!data.length) return <div style={{height:h, background:'var(--bg-2)', borderRadius:8}}/>;
  const W = 320;
  const max = Math.max(...data, 1), min = Math.min(...data, 0), range = max-min || 1;
  const xs = i => (i/(Math.max(1, data.length-1)))*W;
  const ys = v => h - ((v-min)/range)*(h-6) - 3;
  const pts = data.map((v,i) => `${xs(i)},${ys(v)}`).join(' ');
  return (
    <svg viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{width:'100%', height:h, display:'block'}}>
      <defs>
        <linearGradient id="spgrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity=".35"/>
          <stop offset="100%" stopColor={color} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={`0,${h} ${pts} ${W},${h}`} fill="url(#spgrad)"/>
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx={xs(data.length-1)} cy={ys(data[data.length-1])} r="3.5" fill={color} style={{filter:`drop-shadow(0 0 4px ${color})`}}/>
    </svg>
  );
}

function TxRow({ ev, cat }){
  const isPos = ev.kind === 'income' || ev.kind === 'block';
  const c = cat ?? { emoji:'·', name:'Sin categoría', risk:'safe' };
  return (
    <div className="tx-row">
      <div className="tx-emj">{c.emoji}</div>
      <div className="grow">
        <div className="truncate" style={{fontSize:13.5, fontWeight:500}}>{ev.merchant || c.name}</div>
        <div className="row" style={{gap:6, marginTop:3, flexWrap:'wrap'}}>
          <span className="mono" style={{fontSize:10, color:'var(--fg-4)'}}>{B.fmtTime(ev.occurredAt)}</span>
          {ev.need && ev.need !== 'planned' && (
            <span className={"chip " + (ev.need === 'impulse' ? 'amber' : ev.need === 'protected' ? 'green' : '')}>{ev.need}</span>
          )}
        </div>
      </div>
      <span className="tx-amt" style={{color: isPos ? 'var(--accent)' : ev.need === 'impulse' ? 'var(--warn)' : 'var(--fg)'}}>
        {isPos ? '+' : '−'}{B.fmtCOP(ev.amountCents)}
      </span>
    </div>
  );
}

// ─────────────────────────── HOME (espejo de 04 · Home Stability Index) ───────────────────────────
function HomeScreen({ state, go, openCapture }){
  const stab = useMemo(() => B.computeStability(state), [state]);
  const profile = state.profile;
  const today = B.todaysEvents(state);
  const week = B.weeksEvents(state);

  // momentum 7d: serie diaria de ingresos-gastos
  const series = useMemo(()=>{
    const arr = [];
    for (let i = 6; i >= 0; i--){
      const d = B.localDay(B.addDays(new Date(), -i));
      const evs = state.events.filter(e => B.localDay(e.occurredAt) === d);
      const inc = B.sumBy(evs, e => e.kind === 'income');
      const exp = B.sumBy(evs, e => e.kind === 'expense');
      arr.push((inc-exp)/100);
    }
    return arr;
  }, [state.events]);
  const weeklyDelta = series.reduce((s,v)=>s+v, 0);

  // racha principal: hábito "cero domicilios"
  const racha = useMemo(() => B.streakFor(state, 'h-dom'), [state.habitHits]);

  // meta
  const saved = B.metaProgress(state);
  const target = profile.metaTargetCents;
  const metaPct = Math.max(0, Math.min(100, (saved/target)*100));

  // próximas acciones (auto-generadas)
  const nextActions = useMemo(()=>{
    const out = [];
    const today = B.localDay();
    // Hábito anti-fuga sin marcar
    state.habits.filter(h => h.antifuga).forEach(h => {
      if (!state.habitHits[`${today}::${h.id}`]) {
        out.push({ icon:'shield', tag:'ANTI-FUGA', tagKind:'green', title:`Mantener ${h.name.toLowerCase()}`, sub:'Marca al final del día', pri:'P0' });
      }
    });
    // Deudas con vencimiento próximo
    state.debts.filter(d => d.active && d.dueAt).sort((a,b)=> new Date(a.dueAt) - new Date(b.dueAt)).slice(0, 2).forEach(d => {
      const days = Math.floor((new Date(d.dueAt) - new Date()) / (24*3600000));
      if (days < 30){
        out.push({
          icon:'wallet', tag:'DEUDA', tagKind: days < 7 ? 'amber' : 'blue',
          title:`${d.name} · ${B.fmtCOP(Number(d.totalCents)-Number(d.paidCents))}`,
          sub: days <= 0 ? 'Vencido' : `Vence en ${days}d`,
          pri: days < 7 ? 'P0' : 'P1'
        });
      }
    });
    // Capture habit
    if (today === B.localDay() && !state.habitHits[`${today}::h-reg`] && B.todaysEvents(state).length === 0){
      out.push({ icon:'plus', tag:'CAPTURA', tagKind:'blue', title:'Registra tu primer movimiento del día', sub:'Toca el botón verde', pri:'P1' });
    }
    return out.slice(0, 4);
  }, [state]);

  return (
    <>
      <TopBar
        title={profile.name}
        sub={`OPERATOR · ${B.fmtDateHeader().split('·')[1]?.trim() ?? ''}`}
        right={
          <>
            <button className="iconbtn" onClick={()=>go('operator')}><Icon name="bell" size={14}/></button>
            <button className="iconbtn" onClick={()=>go('settings')}><Icon name="cog" size={14}/></button>
          </>
        }
      />
      <div className="view">
        {/* HERO — Stability Index */}
        <div className="card glow slide" style={{padding:18, overflow:'hidden'}}>
          <div style={{position:'absolute', right:-40, top:-40, width:180, height:180, background:'radial-gradient(circle, oklch(.85 .18 150 / .25), transparent 70%)', borderRadius:'50%', pointerEvents:'none'}}/>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', position:'relative'}}>
            <div>
              <div className="micro">STABILITY INDEX · HOY</div>
              <div style={{display:'flex', alignItems:'baseline', gap:6, marginTop:6}}>
                <span className="mono" style={{fontSize:62, fontWeight:500, letterSpacing:'-.03em', color:'var(--accent)', lineHeight:1}}>{stab.score}</span>
                <span className="mono" style={{fontSize:14, color:'var(--fg-4)'}}>/100</span>
              </div>
              <div className="row" style={{gap:6, marginTop:6}}>
                <Icon name="trend" size={12} style={{color:'var(--accent)'}}/>
                <span className="mono" style={{fontSize:11.5, color:'var(--accent)'}}>
                  {state.events.length === 0 ? 'baseline · empieza a registrar' : `${state.events.length} eventos · 30d`}
                </span>
              </div>
            </div>
            <Ring pct={stab.score} size={94}/>
          </div>
          <div style={{marginTop:14, display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8}}>
            <Pillar lbl="CAPITAL" v={stab.pillars.capital}/>
            <Pillar lbl="DISCIPLINA" v={stab.pillars.discipline}/>
            <Pillar lbl="ANTI-FUGA" v={stab.pillars.antifuga}/>
          </div>
        </div>

        {/* MOMENTUM 7D */}
        <div className="card slide">
          <div className="between" style={{marginBottom:10}}>
            <div>
              <div className="micro">MOMENTUM · 7D</div>
              <div className="mono" style={{fontSize:22, fontWeight:500, marginTop:4}}>
                {weeklyDelta >= 0 ? '+' : ''}{B.fmtCOP(weeklyDelta*100)} <span style={{fontSize:13, color:'var(--fg-3)'}}>{weeklyDelta >= 0 ? 'al ahorro' : 'al gasto'}</span>
              </div>
            </div>
            <span className={"chip " + (weeklyDelta >= 0 ? 'green' : 'amber')}>{weeklyDelta >= 0 ? '↗' : '↘'} 7D</span>
          </div>
          <Sparkline data={series}/>
          <div style={{display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4, marginTop:6}}>
            {['L','M','M','J','V','S','D'].map((d,i) => (
              <div key={i} style={{textAlign:'center', fontFamily:'var(--mono)', fontSize:9.5, color: i === 6 ? 'var(--accent)' : 'var(--fg-4)'}}>{d}</div>
            ))}
          </div>
        </div>

        {/* META + RACHA inline */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:12}}>
          <div className="card" onClick={()=>go('meta')} style={{cursor:'pointer'}}>
            <div className="between">
              <span className="micro" style={{fontSize:9.5}}>META 20M</span>
              <span className="chip green" style={{fontSize:10}}>{metaPct.toFixed(1)}%</span>
            </div>
            <div className="mono" style={{fontSize:22, marginTop:8, fontWeight:500}}>{B.fmtCOP(saved)}</div>
            <div className="mono" style={{fontSize:10.5, color:'var(--fg-3)', marginTop:2}}>/ {B.fmtCOP(target)}</div>
            <div className="bar" style={{marginTop:8, height:5}}><i style={{width:Math.max(2, metaPct)+'%'}}/></div>
            <div className="mono" style={{fontSize:10, color:'var(--fg-4)', marginTop:6}}>{metaPct < 1 ? 'EMPIEZA YA' : `${(100-metaPct).toFixed(1)}% RESTANTE`}</div>
          </div>
          <div className="card" onClick={()=>go('habits')} style={{cursor:'pointer'}}>
            <div className="between">
              <span className="micro" style={{fontSize:9.5}}>RACHA</span>
              <Icon name="flame" size={14} style={{color: racha > 0 ? 'var(--accent)' : 'var(--fg-4)'}}/>
            </div>
            <div className="mono" style={{fontSize:32, marginTop:8, fontWeight:500, color: racha > 0 ? 'var(--accent)' : 'var(--fg-3)'}}>
              {racha}<span style={{fontSize:14, color:'var(--fg-3)', marginLeft:4}}>{racha === 1 ? 'día' : 'días'}</span>
            </div>
            <div className="mono" style={{fontSize:10.5, color:'var(--fg-3)', marginTop:2}}>Cero domicilios</div>
            <div style={{display:'flex', gap:3, marginTop:10}}>
              {Array.from({length: Math.max(18, racha)}).slice(0, 18).map((_,i)=>{
                const lit = i < racha;
                return <span key={i} style={{flex:1, height:5, borderRadius:2, background: lit ? 'var(--accent)' : 'var(--bg-2)', boxShadow: i === racha-1 ? '0 0 8px var(--accent)' : 'none'}}/>;
              })}
            </div>
          </div>
        </div>

        {/* PRÓXIMAS ACCIONES */}
        {nextActions.length > 0 && (
          <section>
            <div className="between" style={{padding:'6px 4px 10px'}}>
              <span className="micro">PRÓXIMAS ACCIONES</span>
              <span className="mono" style={{fontSize:10.5, color:'var(--accent-2)'}}>{nextActions.length}</span>
            </div>
            <div className="stack" style={{gap:0}}>
              {nextActions.map((a, i) => (
                <div key={i} className="row" style={{gap:12, padding:'12px 4px', borderTop: i ? '1px solid var(--hair)' : 0}}>
                  <div style={{width:34, height:34, borderRadius:10, background:'var(--bg-2)', border:'1px solid var(--hair)', display:'grid', placeItems:'center', color:'var(--fg-2)', flex:'none'}}>
                    <Icon name={a.icon} size={15}/>
                  </div>
                  <div className="grow">
                    <div className="row" style={{gap:6, marginBottom:3}}>
                      <span className={"chip " + a.tagKind}>{a.tag}</span>
                      <span className="chip">{a.pri}</span>
                    </div>
                    <div className="truncate" style={{fontSize:13.5, fontWeight:500}}>{a.title}</div>
                    <div className="mono" style={{fontSize:10.5, color:'var(--fg-4)', marginTop:1}}>{a.sub}</div>
                  </div>
                  <Icon name="chev" size={14} style={{color:'var(--fg-4)'}}/>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Día de hoy */}
        {today.length > 0 && (
          <section>
            <div className="between" style={{padding:'6px 4px 10px'}}>
              <span className="micro">HOY · {today.length} MOV.</span>
              <span className="mono" style={{fontSize:10.5, color:'var(--fg-4)'}}>{B.fmtDateHeader()}</span>
            </div>
            <div className="stack" style={{gap:6}}>
              {today.slice(0, 4).map(ev => {
                const cat = state.categories.find(c => c.slug === ev.categorySlug);
                return <TxRow key={ev.id} ev={ev} cat={cat}/>;
              })}
            </div>
          </section>
        )}

        {/* AI insight */}
        <div className="card">
          <div className="row" style={{gap:8, marginBottom:8}}>
            <Icon name="ai" size={14} style={{color:'var(--accent)'}}/>
            <span className="micro" style={{color:'var(--accent)'}}>AI OPERATOR · INSIGHT</span>
          </div>
          <div style={{fontSize:13.5, lineHeight:1.5, color:'var(--fg-2)'}}>
            {state.events.length === 0
              ? <>Registra tu primer movimiento para que el operador genere insights con tus datos reales.</>
              : weeklyDelta > 0
                ? <>Si mantienes el ritmo, ahorras <span style={{color:'var(--accent)', fontWeight:600}}>{B.fmtCOP(weeklyDelta*100*4)}</span> en 4 semanas. Recortar 1 fuga te adelanta ~5 días al objetivo.</>
                : <>Tu ritmo está negativo. Revisa <span style={{color:'var(--warn)', fontWeight:600}}>categorías peligrosas</span> y considera bloqueos esta semana.</>
            }
          </div>
          <button className="btn" style={{marginTop:10, width:'100%'}} onClick={()=>go('operator')}>
            Abrir Operator <Icon name="arrow" size={12}/>
          </button>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────── DISCIPLINA · espejo de 11 · Disciplina ───────────────────────────
function HabitsScreen({ state, toggleHabit }){
  const today = B.localDay();
  const todayDone = state.habits.filter(h => state.habitHits[`${today}::${h.id}`]).length;
  const mainHabit = state.habits.find(h => h.id === 'h-dom') || state.habits[0];
  const mainStreak = B.streakFor(state, mainHabit.id);
  const otherHabits = state.habits.filter(h => h.id !== mainHabit.id);

  // microrecompensas: hábitos marcados hoy + capturas hoy
  const todayHits = state.habits.filter(h => state.habitHits[`${today}::${h.id}`]);
  const todayCaptures = B.todaysEvents(state).length;
  const microRewards = [];
  todayHits.forEach(h => microRewards.push({ emoji: h.emoji, title: h.name, sub: 'Marcado hoy', xp:'+15' }));
  if (todayCaptures > 0) microRewards.push({ emoji:'⚡', title:`${todayCaptures} capturas hoy`, sub:'Tu sistema sabe', xp:`+${todayCaptures*2}` });

  return (
    <>
      <TopBar
        title="Disciplina"
        sub="STREAKS · DÍA"
        right={<span className="chip green">DÍA {mainStreak}</span>}
      />
      <div className="view">
        {/* HERO racha grande */}
        <div className="card glow slide" style={{padding:'24px 18px', overflow:'hidden', textAlign:'center', position:'relative'}}>
          <div style={{position:'absolute', inset:0, background:'radial-gradient(circle at 50% 30%, oklch(.85 .18 150 / .18), transparent 60%)', pointerEvents:'none'}}/>
          <div style={{position:'relative'}}>
            <div style={{fontSize:48, marginBottom:2}}>{mainStreak >= 18 ? '🔥' : mainStreak >= 7 ? '⚡' : mainStreak > 0 ? '✦' : '·'}</div>
            <div className="micro">RACHA · {mainHabit.name.toUpperCase()}</div>
            <div className="mono" style={{fontSize:78, fontWeight:300, letterSpacing:'-.04em', marginTop:4, lineHeight:1, color: mainStreak > 0 ? 'var(--accent)' : 'var(--fg-3)'}}>
              {mainStreak}
            </div>
            <div className="mono" style={{fontSize:12, color:'var(--fg-3)', marginTop:4, letterSpacing:'.08em'}}>
              {mainStreak === 1 ? 'DÍA CONSECUTIVO' : 'DÍAS CONSECUTIVOS'}
            </div>
            {/* 30-cell streak bar */}
            <div style={{display:'flex', gap:3, marginTop:18, justifyContent:'center', flexWrap:'wrap'}}>
              {Array.from({length:30}).map((_,i)=>(
                <span key={i} style={{
                  width:8, height:24, borderRadius:2,
                  background: i < mainStreak ? 'var(--accent)' : 'var(--bg-2)',
                  boxShadow: i === mainStreak-1 ? '0 0 10px var(--accent)' : 'none'
                }}/>
              ))}
            </div>
            {mainStreak < 30 && <div className="mono" style={{fontSize:10.5, color:'var(--fg-4)', marginTop:8}}>{30 - mainStreak} días para el desafío 30</div>}
          </div>
        </div>

        {/* Otras rachas — 2x2 grid */}
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:10}}>
          {otherHabits.slice(0, 4).map(h => {
            const s = B.streakFor(state, h.id);
            const checked = !!state.habitHits[`${today}::${h.id}`];
            return (
              <div key={h.id} className="card" style={{padding:12, cursor:'pointer'}} onClick={()=>toggleHabit(h.id)}>
                <div className="between" style={{alignItems:'flex-start'}}>
                  <span style={{fontSize:22}}>{h.emoji}</span>
                  <Icon name="flame" size={12} style={{color: s > 0 ? 'var(--accent)' : 'var(--fg-4)'}}/>
                </div>
                <div className="mono" style={{fontSize:24, fontWeight:500, marginTop:6, color: s > 0 ? 'var(--accent)' : 'var(--fg-3)', lineHeight:1}}>
                  {s}<span style={{fontSize:11, color:'var(--fg-3)', marginLeft:3}}>d</span>
                </div>
                <div style={{fontSize:11.5, color:'var(--fg-3)', marginTop:4}}>{h.name}</div>
                <div style={{marginTop:8, display:'flex', alignItems:'center', gap:6}}>
                  <span style={{
                    width:16, height:16, borderRadius:4, flex:'none',
                    background: checked ? 'var(--accent)' : 'var(--bg-2)',
                    border:'1px solid ' + (checked ? 'var(--accent)' : 'var(--hair)'),
                    display:'grid', placeItems:'center', color:'#06120c'
                  }}>{checked && <Icon name="check" size={10} stroke={3}/>}</span>
                  <span className="mono" style={{fontSize:9.5, color:'var(--fg-4)'}}>{checked ? 'HECHO HOY' : 'TOCA · MARCAR'}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cero domicilios standalone toggle */}
        <div className="card" onClick={()=>toggleHabit(mainHabit.id)} style={{cursor:'pointer'}}>
          <div className="row" style={{gap:12}}>
            <button className={"checkbox " + (state.habitHits[`${today}::${mainHabit.id}`] ? 'on' : '')} style={{pointerEvents:'none'}}>
              {state.habitHits[`${today}::${mainHabit.id}`] && <Icon name="check" size={18} stroke={2.6}/>}
            </button>
            <div className="grow">
              <div style={{fontSize:14, fontWeight:600}}>{mainHabit.name}</div>
              <div className="mono" style={{fontSize:11, color:'var(--fg-4)', marginTop:2}}>Toca para marcar hoy · racha {mainStreak}d</div>
            </div>
            <span className="chip green">ANTI-FUGA</span>
          </div>
        </div>

        {/* Microrecompensas hoy */}
        {microRewards.length > 0 && (
          <section>
            <div className="between" style={{padding:'4px 4px 10px'}}>
              <span className="micro">MICRORECOMPENSAS · HOY</span>
              <span className="chip green">+{microRewards.length * 15} XP</span>
            </div>
            <div className="stack" style={{gap:8}}>
              {microRewards.map((r,i)=>(
                <div key={i} className="row" style={{gap:12, padding:'10px 12px', background:'oklch(0.18 .007 250 / .6)', border:'1px solid var(--hair)', borderRadius:12}}>
                  <div style={{width:34, height:34, borderRadius:10, background:'var(--bg-2)', display:'grid', placeItems:'center', fontSize:18, flex:'none'}}>{r.emoji}</div>
                  <div className="grow">
                    <div style={{fontSize:13, fontWeight:500}}>{r.title}</div>
                    <div className="mono" style={{fontSize:10.5, color:'var(--fg-4)', marginTop:1}}>{r.sub}</div>
                  </div>
                  <span className="chip green">{r.xp} XP</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Resumen */}
        <div className="card">
          <div className="between">
            <span className="micro">HOY</span>
            <span className="mono" style={{fontSize:11}}>{todayDone} / {state.habits.length}</span>
          </div>
          <div className="bar" style={{marginTop:10}}><i style={{width: (todayDone/Math.max(1,state.habits.length))*100 + '%'}}/></div>
          <div className="mono" style={{fontSize:11, color:'var(--fg-3)', marginTop:8}}>
            {todayDone === state.habits.length && state.habits.length > 0
              ? 'Día completo. Identidad, no fuerza de voluntad.'
              : `${state.habits.length - todayDone} hábitos pendientes`}
          </div>
        </div>
      </div>
    </>
  );
}

// ─────────────────────────── META · espejo de 05 · Meta 20M Trajectory ───────────────────────────
function MetaScreen({ state }){
  const saved = B.metaProgress(state);
  const target = state.profile.metaTargetCents;
  const pct = Math.max(0, Math.min(100, (saved/target)*100));
  const stab = B.computeStability(state);
  const monthlySaving = Math.max(0, stab.inputs.monthIncome - stab.inputs.monthSpend);
  const monthsToGoal = monthlySaving > 0 ? Math.ceil((target - saved)/monthlySaving) : null;

  const levels = [
    { lvl:1, name:'Iniciado',    t: 100_000_000,   perks:'Sistema base · XP financiero' },
    { lvl:2, name:'Operador',    t: 500_000_000,   perks:'Fondo emergencia 1 mes' },
    { lvl:3, name:'Estratega',   t:1_000_000_000,  perks:'Primera inversión' },
    { lvl:4, name:'Constructor', t:2_000_000_000,  perks:'Capital semilla · reserva 6m' },
  ];

  return (
    <>
      <TopBar title="Meta 20M" sub="WEALTH TRAJECTORY"/>
      <div className="view">
        {/* HERO */}
        <div className="card glow slide" style={{padding:'20px 18px', overflow:'hidden', position:'relative'}}>
          <div style={{position:'absolute', right:-60, top:-60, width:240, height:240, background:'radial-gradient(circle, oklch(.85 .18 150 / .22), transparent 70%)', borderRadius:'50%', pointerEvents:'none'}}/>
          <div style={{position:'relative'}}>
            <div className="micro">ACUMULACIÓN · LVL {(levels.find(l => saved < l.t) ?? levels[3]).lvl}</div>
            <div className="mono" style={{fontSize:46, fontWeight:500, letterSpacing:'-.03em', marginTop:8, lineHeight:1}}>{B.fmtCOP(saved)}</div>
            <div className="mono" style={{fontSize:13, color:'var(--fg-3)', marginTop:4}}>/ {B.fmtCOP(target)} COP</div>
            <div style={{marginTop:14}}>
              <div className="bar" style={{height:8}}><i style={{width:Math.max(2, pct)+'%'}}/></div>
              <div className="between" style={{marginTop:8}}>
                <span className="mono" style={{fontSize:11, color:'var(--accent)'}}>{pct.toFixed(1)}% completado</span>
                <span className="mono" style={{fontSize:11, color:'var(--fg-3)'}}>{B.fmtCOP(Math.max(0, target-saved))} restante</span>
              </div>
            </div>
            <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:6, marginTop:14}}>
              <Mini lbl="RITMO/M" v={B.fmtCOP(monthlySaving)}/>
              <Mini lbl="ETA" v={monthsToGoal == null ? '—' : `${monthsToGoal}m`}/>
              <Mini lbl="MESES" v={monthsToGoal == null ? '—' : String(monthsToGoal)}/>
            </div>
          </div>
        </div>

        {/* TRAJECTORY chart */}
        <div className="card">
          <div className="between" style={{marginBottom:10}}>
            <div>
              <div className="micro">TRAJECTORY · PROYECCIÓN</div>
              <div style={{fontSize:14, fontWeight:500, marginTop:4}}>Camino a los {B.fmtCOP(target)}</div>
            </div>
          </div>
          <Trajectory state={state} target={target} monthlySaving={monthlySaving}/>
        </div>

        {/* Levels */}
        <section>
          <div className="between" style={{padding:'4px 4px 10px'}}>
            <span className="micro">NIVELES · RPG</span>
          </div>
          <div className="stack" style={{gap:8}}>
            {levels.map(l => {
              const done = saved >= l.t;
              const prev = levels[l.lvl-2]?.t ?? 0;
              const isCur = !done && saved >= prev;
              const localPct = isCur ? ((saved - prev) / (l.t - prev)) * 100 : (done ? 100 : 0);
              return (
                <div key={l.lvl} className={"level-card " + (done ? 'done' : isCur ? 'cur' : '')}>
                  <div className={"level-badge " + (done ? 'done' : isCur ? 'cur' : '')}>
                    {done ? <Icon name="check" size={16} stroke={2.4}/> : l.lvl}
                  </div>
                  <div className="grow">
                    <div className="row" style={{gap:8}}>
                      <span style={{fontSize:13.5, fontWeight:600}}>{l.name}</span>
                      <span className="mono" style={{fontSize:11, color: done ? 'var(--accent)' : isCur ? 'var(--fg)' : 'var(--fg-4)'}}>{B.fmtCOP(l.t)}</span>
                    </div>
                    <div className="mono" style={{fontSize:10.5, color:'var(--fg-4)', marginTop:2}}>{l.perks}</div>
                    {isCur && <div style={{marginTop:6}}><div className="bar" style={{height:4}}><i style={{width:localPct+'%'}}/></div></div>}
                  </div>
                  {done ? <span className="chip green">DONE</span> : isCur ? <span className="chip green">EN CURSO</span> : <span className="chip">LOCKED</span>}
                </div>
              );
            })}
          </div>
        </section>

        {/* Deudas */}
        <div className="card">
          <div className="between">
            <span className="micro">DEUDA ACTIVA</span>
            <span className="chip red">{state.debts.filter(d=>d.active).length} FUENTES</span>
          </div>
          <div className="mono" style={{fontSize:24, fontWeight:500, marginTop:6, color:'var(--warn)'}}>{B.fmtCOP(B.debtTotalRemaining(state))}</div>
          <div className="stack" style={{marginTop:10, gap:0}}>
            {state.debts.filter(d=>d.active).map((d,i)=>(
              <div key={d.id} className="between" style={{padding:'10px 0', borderTop: i ? '1px solid var(--hair)' : 0}}>
                <div>
                  <div style={{fontSize:13, fontWeight:500}}>{d.name}</div>
                  <div className="mono" style={{fontSize:10.5, color:'var(--fg-4)', marginTop:2}}>{d.dueAt ? 'Vence ' + d.dueAt : 'Sin vencimiento'} · {d.rateAnnual}% EA</div>
                </div>
                <div className="mono" style={{fontSize:13}}>{B.fmtCOP(Number(d.totalCents) - Number(d.paidCents))}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

function Mini({ lbl, v }){
  return (
    <div style={{background:'oklch(0.16 .006 250 / .6)', borderRadius:10, padding:'8px 10px', border:'1px solid var(--hair)'}}>
      <div className="micro" style={{fontSize:9}}>{lbl}</div>
      <div className="mono" style={{fontSize:13, fontWeight:500, marginTop:2}}>{v}</div>
    </div>
  );
}

function Trajectory({ state, target, monthlySaving }){
  // 12 months: past from events + projection from monthlySaving
  const now = new Date();
  const points = [];
  for (let i = 5; i >= 0; i--){
    const monthStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    const evs = state.events.filter(e => {
      const d = new Date(e.occurredAt);
      return d >= new Date(0) && d < monthEnd;
    });
    const saved = evs.reduce((s,e) => s + (e.kind === 'income' ? Number(e.amountCents) : e.kind === 'expense' ? -Number(e.amountCents) : 0), 0);
    points.push({ kind:'real', val: Math.max(0, saved/100) });
  }
  let last = points[points.length-1].val;
  for (let i = 1; i <= 6; i++){
    last += monthlySaving/100;
    points.push({ kind:'proj', val: Math.min(target/100, last) });
  }
  const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  const labels = [];
  for (let i = 5; i >= 0; i--) labels.push(months[(now.getMonth() - i + 12) % 12]);
  for (let i = 1; i <= 6; i++) labels.push(months[(now.getMonth() + i) % 12]);
  const W = 320, H = 130, pad = 14;
  const maxVal = Math.max(target/100, ...points.map(p=>p.val));
  const xs = i => pad + (i/(points.length-1))*(W-pad*2);
  const ys = v => H - pad - (v/maxVal)*(H-pad*2);
  const realPts = points.slice(0, 6).map((p,i) => `${xs(i)},${ys(p.val)}`).join(' ');
  const projPts = points.slice(5).map((p,i) => `${xs(i+5)},${ys(p.val)}`).join(' ');
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H+14}`} preserveAspectRatio="none" style={{width:'100%', height:H+14, display:'block'}}>
        <defs>
          <linearGradient id="tjg" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--accent)" stopOpacity=".35"/>
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {[0.25,0.5,0.75,1].map((p,i) => {
          const v = maxVal * p;
          return (
            <g key={i}>
              <line x1={pad} x2={W-pad} y1={ys(v)} y2={ys(v)} stroke="oklch(0.28 .008 250 / .7)" strokeDasharray="2 4"/>
              <text x={W-pad-2} y={ys(v)-2} fontFamily="var(--mono)" fontSize="8.5" fill="var(--fg-4)" textAnchor="end">${(v/1_000_000).toFixed(0)}M</text>
            </g>
          );
        })}
        <polyline points={projPts} fill="none" stroke="var(--accent-2)" strokeWidth="1.6" strokeDasharray="3 4" strokeLinecap="round"/>
        {points.slice(0,6).length > 1 && (
          <>
            <polygon points={`${xs(0)},${H-pad} ${realPts} ${xs(5)},${H-pad}`} fill="url(#tjg)"/>
            <polyline points={realPts} fill="none" stroke="var(--accent)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx={xs(5)} cy={ys(points[5].val)} r="5" fill="var(--accent)" style={{filter:'drop-shadow(0 0 6px var(--accent))'}}/>
            <circle cx={xs(5)} cy={ys(points[5].val)} r="9" fill="none" stroke="var(--accent)" strokeWidth="1" opacity=".4"/>
          </>
        )}
        <circle cx={xs(points.length-1)} cy={ys(points[points.length-1].val)} r="4" fill="var(--accent-2)"/>
        {labels.map((m,i) => i % 2 === 0 && <text key={i} x={xs(i)} y={H+6} fontFamily="var(--mono)" fontSize="8" fill="var(--fg-4)" textAnchor="middle">{m}</text>)}
      </svg>
      <div className="row" style={{gap:14, marginTop:8}}>
        <span className="row" style={{gap:5, fontFamily:'var(--mono)', fontSize:10.5, color:'var(--fg-3)'}}>
          <span style={{width:14, height:2, background:'var(--accent)'}}/>Real
        </span>
        <span className="row" style={{gap:5, fontFamily:'var(--mono)', fontSize:10.5, color:'var(--fg-3)'}}>
          <span style={{width:14, height:2, background:'var(--accent-2)', borderTop:'1px dashed var(--accent-2)'}}/>Proyección
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────── CAPTURE SHEET (sin cambios mayores) ───────────────────────────
function CaptureSheet({ state, save, close }){
  const [step, setStep] = useState(1);
  const [kind, setKind] = useState('expense');
  const [amountStr, setAmountStr] = useState('');
  const [catSlug, setCatSlug] = useState(null);
  const [need, setNeed] = useState(null);
  const [emoBefore, setEmoBefore] = useState(null);
  const [emoAfter, setEmoAfter] = useState(null);
  const [merchant, setMerchant] = useState('');

  const amount = B.parseAmount(amountStr) ?? 0;
  const cents = amount * 100;
  const cats = state.categories.filter(c => kind === 'income' ? c.kind === 'income' : c.kind === 'expense');
  const cat = cats.find(c => c.slug === catSlug);

  function tap(d){
    setAmountStr(prev => {
      if (d === '⌫') return prev.slice(0, -1);
      if (d === 'k' || d === 'm'){ if (/[km]$/.test(prev)) return prev; return prev + d; }
      return prev + d;
    });
  }

  function commit(){
    save({
      id: 'e-' + Date.now() + '-' + Math.random().toString(36).slice(2,7),
      occurredAt: new Date().toISOString(),
      kind, amountCents: cents, categorySlug: catSlug, need,
      emotionBefore: emoBefore, emotionAfter: emoAfter,
      merchant: merchant || null,
    });
    close();
  }

  return (
    <div className="sheet-overlay" onClick={e => { if (e.target === e.currentTarget) close(); }}>
      <div className="sheet">
        <div className="sheet-handle"/>
        <div className="between" style={{marginBottom:12}}>
          <button className="iconbtn" onClick={() => step > 1 ? setStep(step-1) : close()}>
            <Icon name={step > 1 ? 'back' : 'close'} size={14}/>
          </button>
          <div className="micro">PASO {step} / {kind === 'expense' ? 3 : 2}</div>
          <button onClick={close} style={{background:'transparent', border:0, color:'var(--fg-3)', fontFamily:'var(--mono)', fontSize:11}}>SALIR</button>
        </div>
        <div style={{display:'flex', gap:4, marginBottom:14}}>
          {[1,2,3].map(i => (
            <div key={i} style={{
              flex:1, height:3, borderRadius:99,
              background: i <= step ? 'var(--accent)' : 'var(--bg-2)',
              boxShadow: i === step ? '0 0 8px var(--accent)' : 'none',
              opacity: (i === 3 && kind === 'income') ? 0 : 1,
            }}/>
          ))}
        </div>

        <div style={{flex:1, overflow:'auto', padding:'4px 2px'}}>
          {step === 1 && (
            <div className="stack slide" style={{gap:18}}>
              <div className="row" style={{justifyContent:'center', gap:8}}>
                {[['expense','Gasto'],['income','Ingreso']].map(([v,l]) => (
                  <button key={v} onClick={()=>setKind(v)} style={{
                    padding:'8px 20px', borderRadius:99, fontSize:13, fontWeight:500,
                    background: kind === v ? 'var(--accent-soft)' : 'var(--bg-2)',
                    border:'1px solid ' + (kind === v ? 'oklch(.85 .18 150 / .5)' : 'var(--hair)'),
                    color: kind === v ? 'var(--accent)' : 'var(--fg-2)',
                    cursor:'pointer'
                  }}>{l}</button>
                ))}
              </div>
              <div style={{textAlign:'center', padding:'8px 0'}}>
                <div className="micro">{kind === 'income' ? 'INGRESO' : 'GASTO'}</div>
                <div style={{display:'flex', alignItems:'baseline', justifyContent:'center', gap:6, marginTop:8}}>
                  <span className="mono" style={{fontSize:18, color:'var(--fg-3)'}}>$</span>
                  <span className="mono" style={{fontSize:54, fontWeight:500, letterSpacing:'-.03em', lineHeight:1}}>{amountStr ? amount.toLocaleString('es-CO') : '0'}</span>
                  <span className="mono" style={{fontSize:12, color:'var(--fg-3)'}}>COP</span>
                </div>
                <div className="mono" style={{fontSize:10, color:'var(--fg-4)', marginTop:6}}>Tip: usa <b>k</b> para mil · <b>m</b> para millón</div>
              </div>
              <div className="keypad">
                {['1','2','3','4','5','6','7','8','9','k','0','⌫'].map(d => (
                  <button key={d} className={"key " + (d === 'k' || d === '⌫' ? 'alt' : '')} onClick={()=>tap(d)}>{d}</button>
                ))}
              </div>
              <button className="btn primary" disabled={cents <= 0} onClick={()=>setStep(2)}>
                Siguiente · {B.fmtCOP(cents)}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="stack slide" style={{gap:14}}>
              <div style={{textAlign:'center'}}>
                <div className="micro">{kind === 'income' ? '¿DE DÓNDE?' : '¿EN QUÉ?'}</div>
                <div className="mono" style={{fontSize:30, fontWeight:500, marginTop:6}}>
                  {kind === 'income' ? '+' : '−'}{B.fmtCOP(cents)}
                </div>
              </div>
              <div className="cat-grid">
                {cats.map(c => (
                  <button key={c.slug} className={"cat " + (catSlug === c.slug ? 'on' : '')} onClick={()=>setCatSlug(c.slug)}>
                    <span className="emj">{c.emoji}</span>
                    <span className="nm">{c.name}</span>
                    {c.risk === 'danger' && <span className="chip amber" style={{fontSize:9, padding:'1px 6px'}}>vigilar</span>}
                  </button>
                ))}
              </div>
              <input
                className="input" style={{fontSize:13, fontFamily:'var(--sans)'}}
                placeholder={kind === 'income' ? 'Fuente · cliente (opcional)' : 'Lugar · merchant (opcional)'}
                value={merchant}
                onChange={e => setMerchant(e.target.value)}
              />
              {kind === 'income' ? (
                <button className="btn primary" disabled={!catSlug} onClick={commit}>Guardar · +{B.fmtCOP(cents)}</button>
              ) : (
                <button className="btn primary" disabled={!catSlug} onClick={()=>setStep(3)}>Siguiente</button>
              )}
            </div>
          )}

          {step === 3 && kind === 'expense' && (
            <div className="stack slide" style={{gap:14}}>
              <div className="card" style={{padding:14}}>
                <div className="between">
                  <div>
                    <div className="micro">REGISTRADO</div>
                    <div className="mono" style={{fontSize:24, fontWeight:500, marginTop:4}}>−{B.fmtCOP(cents)}</div>
                    <div style={{fontSize:12, color:'var(--fg-3)', marginTop:2}}>{cat?.emoji} {cat?.name}{merchant ? ' · ' + merchant : ''}</div>
                  </div>
                </div>
              </div>
              <div>
                <div className="micro" style={{marginBottom:8}}>¿NECESIDAD O IMPULSO?</div>
                <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8}}>
                  <button onClick={()=>setNeed('necessary')} style={choiceStyle(need === 'necessary', 'var(--accent)')}>
                    <Icon name="check" size={16} style={{color:'var(--accent)'}}/>
                    <div style={{fontSize:13, fontWeight:600, marginTop:4}}>Necesario</div>
                    <div className="mono" style={{fontSize:10, color:'var(--fg-4)'}}>Lo planeé</div>
                  </button>
                  <button onClick={()=>setNeed('impulse')} style={choiceStyle(need === 'impulse', 'var(--warn)')}>
                    <Icon name="flame" size={16} style={{color:'var(--warn)'}}/>
                    <div style={{fontSize:13, fontWeight:600, marginTop:4}}>Impulso</div>
                    <div className="mono" style={{fontSize:10, color:'var(--fg-4)'}}>No estaba en el plan</div>
                  </button>
                </div>
              </div>
              <div>
                <div className="micro" style={{marginBottom:8}}>EMOCIÓN · OPCIONAL</div>
                <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                  {[['😌','tranquilo'],['😏','antojo'],['😩','estrés'],['🥺','triste'],['🤩','euforia'],['🥱','aburrido'],['😤','frustración']].map(([e,l]) => (
                    <button key={l} onClick={()=>setEmoBefore(emoBefore === l ? null : l)} style={{
                      display:'inline-flex', alignItems:'center', gap:6, padding:'6px 10px', borderRadius:99, fontSize:11.5,
                      background: emoBefore === l ? 'oklch(.82 .16 80 / .18)' : 'var(--bg-1)',
                      border:'1px solid ' + (emoBefore === l ? 'oklch(.82 .16 80 / .5)' : 'var(--hair)'),
                      color: emoBefore === l ? 'var(--warn)' : 'var(--fg-2)', cursor:'pointer'
                    }}><span style={{fontSize:14}}>{e}</span>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="micro" style={{marginBottom:8}}>¿CÓMO TE SIENTES DESPUÉS?</div>
                <div className="row" style={{gap:6, justifyContent:'space-between'}}>
                  {['😟','😕','😐','🙂','😄'].map((e, i) => (
                    <button key={i} onClick={()=>setEmoAfter(emoAfter === i+1 ? null : i+1)} style={{
                      flex:1, height:48, borderRadius:12, fontSize:22,
                      background: emoAfter === i+1 ? 'var(--accent-soft)' : 'var(--bg-1)',
                      border:'1px solid ' + (emoAfter === i+1 ? 'oklch(.85 .18 150 / .5)' : 'var(--hair)'),
                      cursor:'pointer'
                    }}>{e}</button>
                  ))}
                </div>
              </div>
              <button className="btn primary" onClick={commit}>Confirmar</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
function choiceStyle(sel, color){
  return {
    padding:14, borderRadius:12, textAlign:'left', cursor:'pointer',
    background: sel ? `color-mix(in oklch, ${color} 15%, transparent)` : 'var(--bg-1)',
    border:'1px solid ' + (sel ? `color-mix(in oklch, ${color} 50%, transparent)` : 'var(--hair)'),
    boxShadow: sel ? `0 0 18px color-mix(in oklch, ${color} 25%, transparent)` : 'none',
    color:'var(--fg)'
  };
}

// ─────────────────────────── OPERATOR (chat) ───────────────────────────
function OperatorScreen({ state, addBriefing }){
  const [busy, setBusy] = useState(false);
  const [input, setInput] = useState('');
  const [msgs, setMsgs] = useState(state.briefings.slice(-10));
  const scrollRef = useRef(null);

  useEffect(()=>{
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [msgs]);

  async function generateBriefing(){
    setBusy(true);
    const stab = B.computeStability(state);
    const spent = B.sumBy(B.todaysEvents(state), e => e.kind === 'expense');
    const impulses = B.monthsEvents(state).filter(e => e.need === 'impulse').length;
    const streak = state.habits.map(h => ({ name: h.name, streak: B.streakFor(state, h.id) }));
    const nextDebt = state.debts.filter(d=>d.active && d.dueAt).sort((a,b)=> new Date(a.dueAt) - new Date(b.dueAt))[0];
    const data = {
      stability: stab.score, pillars: stab.pillars,
      today_spend_cop: Math.round(spent/100),
      daily_limit_cop: Math.round(state.profile.dailyLimitCents/100),
      impulses_30d: impulses, habits: streak,
      saved_so_far_cop: Math.round(B.metaProgress(state)/100),
      meta_target_cop: Math.round(state.profile.metaTargetCents/100),
      next_debt: nextDebt ? { name: nextDebt.name, due: nextDebt.dueAt, remaining_cop: Math.round((Number(nextDebt.totalCents)-Number(nextDebt.paidCents))/100) } : null,
      total_events: state.events.length,
    };
    const prompt = `Eres el BRAYAN OS Operator. Genera un briefing matutino en español de Colombia.
Datos: ${JSON.stringify(data, null, 2)}
Reglas: ≤100 palabras, directo, sin emojis, sin "¡bien hecho!". 1 frase de estado, 1-2 acciones concretas con números, 1 riesgo si aplica. Si total_events es 0, dile que registre su primer movimiento. Nunca inventes números.
Responde directo, sin preámbulo.`;
    try {
      const text = await window.claude.complete(prompt);
      const msg = { id: 'b-'+Date.now(), kind: 'ai', content: text, createdAt: new Date().toISOString() };
      addBriefing(msg);
      setMsgs(m => [...m, msg]);
    } catch(e){
      const msg = { id: 'b-'+Date.now(), kind: 'ai', content: 'No pude conectar con el operador. Reintenta.', createdAt: new Date().toISOString() };
      setMsgs(m => [...m, msg]);
    }
    setBusy(false);
  }

  async function ask(){
    if (!input.trim()) return;
    setBusy(true);
    const userMsg = { id: 'u-'+Date.now(), kind: 'user', content: input, createdAt: new Date().toISOString() };
    setMsgs(m => [...m, userMsg]);
    const q = input;
    setInput('');
    const stab = B.computeStability(state);
    const data = {
      stability: stab.score, pillars: stab.pillars,
      saved_so_far_cop: Math.round(B.metaProgress(state)/100),
      meta_target_cop: Math.round(state.profile.metaTargetCents/100),
      events_30d: B.monthsEvents(state).length,
      debts: state.debts.filter(d=>d.active).map(d=>({name:d.name, remaining_cop: Math.round((Number(d.totalCents)-Number(d.paidCents))/100), due:d.dueAt})),
    };
    const prompt = `Eres BRAYAN OS Operator. Responde en es-CO, ≤80 palabras, directo, sin emojis.
Contexto: ${JSON.stringify(data)}
Pregunta: ${q}
Responde con números concretos solo si están en el contexto. Si no, sé honesto.`;
    try {
      const text = await window.claude.complete(prompt);
      const aiMsg = { id: 'a-'+Date.now(), kind: 'ai', content: text, createdAt: new Date().toISOString() };
      addBriefing(aiMsg);
      setMsgs(m => [...m, aiMsg]);
    } catch(e){ console.error(e); }
    setBusy(false);
  }

  return (
    <>
      <TopBar
        title="AI Operator"
        sub="STABILITY ENGINE · ONLINE"
        right={
          <>
            <span className="chip green">● LIVE</span>
            <button className="iconbtn" onClick={generateBriefing} disabled={busy}><Icon name="refresh" size={14}/></button>
          </>
        }
      />
      <div className="view" ref={scrollRef} style={{paddingBottom:200}}>
        {msgs.length === 0 && (
          <div className="card glow">
            <div className="row" style={{gap:10, marginBottom:8}}>
              <div style={{width:32, height:32, borderRadius:9, background:'linear-gradient(135deg, var(--accent), var(--accent-2))', display:'grid', placeItems:'center', color:'#06120c'}}>
                <Icon name="ai" size={16} stroke={2}/>
              </div>
              <div>
                <div style={{fontSize:13, fontWeight:600}}>Operator IA</div>
                <div className="mono" style={{fontSize:10, color:'var(--fg-4)'}}>21 MAY · LISTO</div>
              </div>
            </div>
            <div style={{fontSize:14, lineHeight:1.55}}>
              Toca el ícono de refrescar para tu primer briefing. O escribe abajo lo que quieres saber.
            </div>
          </div>
        )}
        {msgs.map(m => (
          <div key={m.id} className={"msg " + (m.kind === 'user' ? 'me' : 'ai')} style={{whiteSpace:'pre-wrap'}}>
            {m.content}
            <div className="ts">{B.fmtTime(m.createdAt)}</div>
          </div>
        ))}
        {busy && <div className="msg ai pulse"><Icon name="ai" size={14}/> pensando…</div>}
      </div>
      <div style={{position:'fixed', left:12, right:12, bottom:'calc(86px + env(safe-area-inset-bottom))', zIndex:30, display:'flex', gap:8, background:'oklch(0.16 .006 250 / .92)', backdropFilter:'blur(14px)', border:'1px solid var(--hair)', borderRadius:18, padding:8, boxShadow:'0 12px 30px -10px oklch(0 0 0 / .6)'}}>
        <input
          className="input" style={{fontFamily:'var(--sans)', fontSize:13, background:'transparent', border:'none', padding:'10px 8px'}}
          placeholder="Pregúntale al operator…"
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') ask(); }}
        />
        <button className="btn primary" onClick={ask} disabled={busy || !input.trim()} style={{padding:'8px 14px'}}>
          <Icon name="arrow" size={14} stroke={2.4}/>
        </button>
      </div>
    </>
  );
}

// ─────────────────────────── SETTINGS ───────────────────────────
function SettingsScreen({ state, update, reset, exportData, importData }){
  return (
    <>
      <TopBar title="Settings" sub="CUENTA · DATOS"/>
      <div className="view">
        <div className="card">
          <div className="micro">PERFIL</div>
          <input className="input" style={{marginTop:8, fontFamily:'var(--sans)'}} value={state.profile.name} onChange={e => update({ profile: { ...state.profile, name: e.target.value }})}/>
          <div className="micro" style={{marginTop:14}}>LÍMITE DIARIO DE GASTO</div>
          <div className="mono" style={{fontSize:22, fontWeight:500, marginTop:6}}>{B.fmtCOP(state.profile.dailyLimitCents)}</div>
          <input type="range" min="5000000" max="50000000" step="1000000" value={state.profile.dailyLimitCents}
            onChange={e => update({ profile: { ...state.profile, dailyLimitCents: Number(e.target.value) }})}
            style={{width:'100%', accentColor:'var(--accent)', marginTop:8}}/>
          <div className="micro" style={{marginTop:14}}>META TOTAL</div>
          <div className="mono" style={{fontSize:22, fontWeight:500, marginTop:6}}>{B.fmtCOP(state.profile.metaTargetCents)}</div>
          <input type="range" min="500000000" max="5000000000" step="100000000" value={state.profile.metaTargetCents}
            onChange={e => update({ profile: { ...state.profile, metaTargetCents: Number(e.target.value) }})}
            style={{width:'100%', accentColor:'var(--accent)', marginTop:8}}/>
        </div>

        <div className="card">
          <div className="micro">INSTALAR COMO APP</div>
          <div style={{fontSize:13, marginTop:8, lineHeight:1.5}}>
            <b>iPhone (Safari):</b> Toca <Icon name="share" size={12} style={{display:'inline-flex', verticalAlign:'middle'}}/> → "Agregar a pantalla de inicio".
            <br/><b>Android (Chrome):</b> menú ⋮ → "Instalar app".
          </div>
        </div>

        <div className="card">
          <div className="micro">DATOS</div>
          <div style={{fontSize:13, marginTop:8, color:'var(--fg-3)'}}>{state.events.length} eventos · {Object.keys(state.habitHits).length} hits de hábitos guardados localmente.</div>
          <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginTop:12}}>
            <button className="btn" onClick={exportData}>Exportar JSON</button>
            <label className="btn" style={{cursor:'pointer'}}>
              Importar
              <input type="file" accept="application/json" style={{display:'none'}} onChange={e => { const f = e.target.files?.[0]; if (f) importData(f); }}/>
            </label>
          </div>
          <button className="btn" style={{marginTop:8, width:'100%', borderColor:'var(--danger)', color:'var(--danger)'}} onClick={() => {
            if (confirm('¿Borrar todos los datos? Esto no se puede deshacer.')) reset();
          }}>Borrar todo</button>
        </div>

        <div className="card" style={{textAlign:'center'}}>
          <div className="micro">BRAYAN OS</div>
          <div style={{fontSize:13, marginTop:6, color:'var(--fg-3)'}}>Alpha standalone · v1.0</div>
          <div className="mono" style={{fontSize:10, color:'var(--fg-4)', marginTop:4}}>localStorage · sin servidor · privado</div>
        </div>
      </div>
    </>
  );
}

window.BOS_Screens = { HomeScreen, MetaScreen, HabitsScreen, OperatorScreen, SettingsScreen, CaptureSheet, TopBar };
