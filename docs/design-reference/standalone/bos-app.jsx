/* BRAYAN OS · app shell · 11 pantallas */
const { useState, useEffect } = React;
const B = window.BOS;
const Icon = window.Icon;
const S = window.BOS_Screens;
const X = window.BOS_Extra;

function App(){
  const [state, setState] = useState(() => B.loadState());
  const [tab, setTab] = useState('home');
  const [captureOpen, setCaptureOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [lockOpen, setLockOpen] = useState(() => {
    const s = B.loadState();
    const today = B.localDay();
    return s.prefs?.lastLockSeen !== today;
  });

  useEffect(() => { B.saveState(state); }, [state]);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2200);
    return () => clearTimeout(t);
  }, [toast]);

  function update(partial){ setState(s => ({ ...s, ...partial })); }
  function showToast(msg){ setToast(msg); }

  function saveEvent(ev){
    setState(s => ({ ...s, events: [...s.events, ev] }));
    showToast(ev.kind === 'income' ? `+${B.fmtCOP(ev.amountCents)} registrado` : `${B.fmtCOP(ev.amountCents)} registrado`);
    if (ev.kind === 'expense'){
      const today = B.localDay();
      const k = `${today}::h-reg`;
      if (!state.habitHits[k]){
        setState(s => ({ ...s, habitHits: { ...s.habitHits, [k]: true }}));
      }
    }
  }
  function toggleHabit(habitId){
    const today = B.localDay();
    const k = `${today}::${habitId}`;
    setState(s => {
      const hits = { ...s.habitHits };
      if (hits[k]) delete hits[k];
      else hits[k] = true;
      return { ...s, habitHits: hits };
    });
  }
  function addBriefing(b){ setState(s => ({ ...s, briefings: [...s.briefings, b].slice(-50) })); }
  function updateProject(id, patch){
    setState(s => ({ ...s, projects: s.projects.map(p => p.id === id ? { ...p, ...patch } : p) }));
    showToast('Proyecto actualizado');
  }
  function saveReview(r){
    setState(s => ({ ...s, reviews: [...(s.reviews ?? []), r] }));
    showToast('Semana cerrada');
  }
  function dismissLock(){
    setLockOpen(false);
    setState(s => ({ ...s, prefs: { ...s.prefs, lastLockSeen: B.localDay() }}));
  }
  function showLock(){ setLockOpen(true); }
  function resetAll(){ setState(B.resetState()); showToast('Datos borrados'); }
  function exportData(){
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `brayan-os-${B.localDay()}.json`; a.click();
    URL.revokeObjectURL(url);
    showToast('Exportado');
  }
  function importData(file){
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.profile || !Array.isArray(data.events)) throw new Error();
        setState(data); showToast('Importado');
      } catch { showToast('Error al importar'); }
    };
    reader.readAsText(file);
  }

  const screens = {
    home:     <S.HomeScreen     state={state} go={setTab} openCapture={()=>setCaptureOpen(true)}/>,
    today:    <X.TodayScreen    state={state}/>,
    meta:     <S.MetaScreen     state={state}/>,
    habits:   <S.HabitsScreen   state={state} toggleHabit={toggleHabit}/>,
    fuga:     <X.FugaScreen     state={state}/>,
    ceo:      <X.CeoScreen      state={state} updateProject={updateProject}/>,
    review:   <X.WeeklyScreen   state={state} saveReview={saveReview}/>,
    operator: <S.OperatorScreen state={state} addBriefing={addBriefing}/>,
    settings: <S.SettingsScreen state={state} update={update} reset={resetAll} exportData={exportData} importData={importData}/>,
    more:     <X.MoreScreen     go={setTab} showLock={showLock}/>,
  };

  return (
    <>
      {screens[tab] || screens.home}

      <nav className="tabbar">
        <TabButton active={tab==='home'}   onClick={()=>setTab('home')}   icon="home"   label="Home"/>
        <TabButton active={tab==='today' || tab==='fuga' || tab==='operator'} onClick={()=>setTab('today')} icon="pulse" label="Today"/>
        <button className="fab" onClick={()=>setCaptureOpen(true)}><Icon name="plus" size={24} stroke={2.4}/></button>
        <TabButton active={tab==='meta' || tab==='habits'} onClick={()=>setTab('meta')} icon="target" label="Meta"/>
        <TabButton active={tab==='more' || tab==='ceo' || tab==='review' || tab==='settings'} onClick={()=>setTab('more')} icon="more" label="Más"/>
      </nav>

      {captureOpen && <S.CaptureSheet state={state} save={saveEvent} close={()=>setCaptureOpen(false)}/>}
      {lockOpen && <X.LockScreen state={state} addBriefing={addBriefing} onUnlock={dismissLock}/>}
      {toast && <div className="toast">{toast}</div>}
    </>
  );
}

function TabButton({ active, onClick, icon, label }){
  return (
    <button className={"tab " + (active ? 'on' : '')} onClick={onClick}>
      <Icon name={icon} size={20}/>
      <span className="lbl">{label}</span>
    </button>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
