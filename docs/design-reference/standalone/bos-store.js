/* BRAYAN OS · store + helpers (localStorage) */
const KEY = 'brayan-os.v1';

const DEFAULT_STATE = {
  version: 1,
  profile: {
    name: 'Brayan',
    city: 'Medellín',
    dailyLimitCents: 15_000_000,        // $150.000
    metaTargetCents: 2_000_000_000,     // $20.000.000
    startedAt: new Date().toISOString().slice(0,10),
  },
  categories: [
    { slug:'domicilios',          name:'Domicilios',          emoji:'🍔', kind:'expense', risk:'danger' },
    { slug:'compras-emocionales', name:'Compras emocionales', emoji:'📚', kind:'expense', risk:'danger' },
    { slug:'ropa',                name:'Ropa',                emoji:'👕', kind:'expense', risk:'watch'  },
    { slug:'salidas',             name:'Salidas / ocio',      emoji:'🍻', kind:'expense', risk:'watch'  },
    { slug:'suscripciones',       name:'Suscripciones',       emoji:'🎬', kind:'expense', risk:'watch'  },
    { slug:'novia',               name:'Novia · regalos',     emoji:'💝', kind:'expense', risk:'watch'  },
    { slug:'cafe',                name:'Café & desayuno',     emoji:'☕', kind:'expense', risk:'safe'   },
    { slug:'gasolina',            name:'Gasolina',            emoji:'⛽', kind:'expense', risk:'safe'   },
    { slug:'supermercado',        name:'Supermercado',        emoji:'🛒', kind:'expense', risk:'safe'   },
    { slug:'transporte',          name:'Transporte',          emoji:'🚕', kind:'expense', risk:'safe'   },
    { slug:'universidad',         name:'Universidad',         emoji:'🎓', kind:'expense', risk:'safe'   },
    { slug:'otros',               name:'Otros',               emoji:'·',  kind:'expense', risk:'watch'  },
    { slug:'contrato-1',          name:'Contrato Estatal 1',  emoji:'💼', kind:'income',  risk:'safe'   },
    { slug:'contrato-2',          name:'Contrato Estatal 2',  emoji:'💼', kind:'income',  risk:'safe'   },
    { slug:'restaurante',         name:'Restaurante · dom',   emoji:'🍽️', kind:'income',  risk:'safe'  },
    { slug:'freelance',           name:'Freelance · WP/IA',   emoji:'🛠️', kind:'income',  risk:'safe'  },
  ],
  debts: [
    { id:'d-fam', name:'Deuda familiar', source:'familia',    totalCents:200_000_000, paidCents:0, rateAnnual:0,    dueAt:null,         active:true },
    { id:'d-rap', name:'Rapicredit',     source:'rapicredit', totalCents: 94_850_000, paidCents:0, rateAnnual:26.0, dueAt:'2026-05-28', active:true },
    { id:'d-sol', name:'Solventa',       source:'solventa',   totalCents: 78_200_000, paidCents:0, rateAnnual:22.0, dueAt:'2026-06-04', active:true },
    { id:'d-uni', name:'Universidad',    source:'universidad',totalCents:147_000_000, paidCents:0, rateAnnual:0,    dueAt:'2026-06-12', active:true },
  ],
  habits: [
    { id:'h-dom',  name:'Cero domicilios',         emoji:'🛡️', antifuga:true,  createdAt:null },
    { id:'h-reg',  name:'Registrar gastos del día',emoji:'📝', antifuga:false, createdAt:null },
    { id:'h-lec',  name:'Lectura · 30 min',        emoji:'📚', antifuga:false, createdAt:null },
    { id:'h-gym',  name:'Gym',                     emoji:'💪', antifuga:false, createdAt:null },
    { id:'h-dw',   name:'Deep work · 2h',          emoji:'🧠', antifuga:false, createdAt:null },
  ],
  habitHits: {},   // { 'YYYY-MM-DD::habitId': true }
  events: [],      // money_events
  briefings: [],   // ai briefings
  projects: [
    { id:'p-1', code:'WP-019', name:'Portal Alcaldía Pasto', client:'Gobernación', valueCents:1_840_000_000, progress:62, deadline:'2026-06-15', stage:'active' },
    { id:'p-2', code:'AUT-007',name:'ERP Acme S.A.',         client:'Acme S.A.',  valueCents:  720_000_000, progress:18, deadline:'2026-06-30', stage:'discovery' },
    { id:'p-3', code:'WP-021', name:'Landing Clínica Norte', client:'Clínica Norte', valueCents:380_000_000, progress:84, deadline:'2026-05-28', stage:'active' },
    { id:'p-4', code:'IA-004', name:'Chatbot · Inmobiliaria',client:'BR Inmobiliaria', valueCents:540_000_000, progress:8, deadline:'2026-06-10', stage:'proposal' },
  ],
  reviews: [],     // weekly_reviews
  prefs: {
    lastBriefingDate: null,
    lastLockSeen: null,
    seenInstallHint: false,
  }
};

function loadState(){
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return structuredClone(DEFAULT_STATE);
    const parsed = JSON.parse(raw);
    return migrate(parsed);
  } catch(e){
    console.error('load failed', e);
    return structuredClone(DEFAULT_STATE);
  }
}
function saveState(s){
  try { localStorage.setItem(KEY, JSON.stringify(s)); }
  catch(e){ console.error('save failed', e); }
}
function migrate(s){
  // ensure all top-level keys exist
  const base = structuredClone(DEFAULT_STATE);
  for (const k of Object.keys(base)) if (!(k in s)) s[k] = base[k];
  return s;
}
function resetState(){
  localStorage.removeItem(KEY);
  return structuredClone(DEFAULT_STATE);
}

// ─── money helpers ───
function fmtCOP(cents){
  const n = Number(cents)/100;
  const abs = Math.abs(n);
  if (abs >= 1_000_000) return '$' + (n/1_000_000).toFixed(abs >= 10_000_000 ? 1 : 2).replace(/\.?0+$/, '') + 'M';
  if (abs >= 1_000) return '$' + Math.round(n/1_000) + 'K';
  return '$' + Math.round(n).toLocaleString('es-CO');
}
function fmtFull(cents){ return '$' + Math.round(Number(cents)/100).toLocaleString('es-CO'); }

function parseAmount(s){
  if (!s) return null;
  const cleaned = String(s).toLowerCase().replace(/\s|\$|\.cop/g,'').replace(/\./g,'').replace(',', '.');
  const m = /^(-?\d+(?:\.\d+)?)([km]?)$/.exec(cleaned);
  if (!m) return null;
  let n = parseFloat(m[1]);
  if (m[2] === 'k') n *= 1_000;
  if (m[2] === 'm') n *= 1_000_000;
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.round(n);
}

// ─── date helpers (America/Bogota, UTC-5, no DST) ───
function localDay(d = new Date()){
  // Force UTC-5 offset
  const utc = d.getTime() + d.getTimezoneOffset()*60000;
  const bog = new Date(utc - 5*3600000);
  return bog.toISOString().slice(0,10);
}
function localHour(d = new Date()){
  const utc = d.getTime() + d.getTimezoneOffset()*60000;
  const bog = new Date(utc - 5*3600000);
  return bog.getHours();
}
function dayPart(d){
  const h = localHour(new Date(d));
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'night';
}
function fmtTime(d){
  const x = new Date(d);
  const utc = x.getTime() + x.getTimezoneOffset()*60000;
  const bog = new Date(utc - 5*3600000);
  return String(bog.getHours()).padStart(2,'0') + ':' + String(bog.getMinutes()).padStart(2,'0');
}
function fmtDateHeader(d = new Date()){
  const utc = d.getTime() + d.getTimezoneOffset()*60000;
  const bog = new Date(utc - 5*3600000);
  const days = ['DOMINGO','LUNES','MARTES','MIÉRCOLES','JUEVES','VIERNES','SÁBADO'];
  const months = ['ENE','FEB','MAR','ABR','MAY','JUN','JUL','AGO','SEP','OCT','NOV','DIC'];
  return `${days[bog.getDay()]} · ${bog.getDate()} ${months[bog.getMonth()]}`;
}
function addDays(d, n){ const x = new Date(d); x.setDate(x.getDate()+n); return x; }
function daysBetween(a, b){ return Math.floor((new Date(b)-new Date(a))/(24*3600000)); }

// ─── analytics on state ───
function todaysEvents(state){
  const today = localDay();
  return state.events.filter(e => localDay(e.occurredAt) === today);
}
function weeksEvents(state){
  const today = new Date();
  const start = addDays(today, -6);
  const cutoff = localDay(start);
  return state.events.filter(e => localDay(e.occurredAt) >= cutoff);
}
function monthsEvents(state){
  const today = new Date();
  const start = addDays(today, -29);
  const cutoff = localDay(start);
  return state.events.filter(e => localDay(e.occurredAt) >= cutoff);
}

function sumBy(list, pred){ return list.reduce((s, e) => s + (pred(e) ? Number(e.amountCents) : 0), 0); }

function streakFor(state, habitId){
  let n = 0;
  let day = new Date();
  for (let i = 0; i < 365; i++){
    const k = `${localDay(day)}::${habitId}`;
    if (state.habitHits[k]) n++;
    else if (i === 0) {
      // today not done yet — skip without breaking streak
      day = addDays(day, -1);
      continue;
    } else break;
    day = addDays(day, -1);
  }
  return n;
}

function streakDays(state, habitId, days = 30){
  const out = [];
  let day = new Date();
  for (let i = 0; i < days; i++){
    const k = `${localDay(day)}::${habitId}`;
    out.unshift({ day: localDay(day), on: !!state.habitHits[k] });
    day = addDays(day, -1);
  }
  return out;
}

function daysSinceLastImpulse(state){
  const impulses = state.events.filter(e => e.need === 'impulse').sort((a,b)=> new Date(b.occurredAt) - new Date(a.occurredAt));
  if (impulses.length === 0) return 999;
  return daysBetween(impulses[0].occurredAt, new Date());
}

function metaProgress(state){
  const saved = state.events.reduce((s,e) => {
    if (e.kind === 'income') return s + Number(e.amountCents);
    if (e.kind === 'expense') return s - Number(e.amountCents);
    return s;
  }, 0);
  return Math.max(0, saved);
}

function debtTotalRemaining(state){
  return state.debts.filter(d => d.active).reduce((s,d) => s + (Number(d.totalCents) - Number(d.paidCents)), 0);
}

// ─── Stability Index ───
function computeStability(state){
  const month = monthsEvents(state);
  const week = weeksEvents(state);
  const monthIncome = sumBy(month, e => e.kind === 'income');
  const monthSpend = sumBy(month, e => e.kind === 'expense');
  const dailyLimit = state.profile.dailyLimitCents;
  const target = state.profile.metaTargetCents;
  const dangerCats = new Set(state.categories.filter(c => c.risk === 'danger').map(c => c.slug));
  const dangerSpend = sumBy(month, e => e.kind === 'expense' && dangerCats.has(e.categorySlug));
  const impulses = month.filter(e => e.need === 'impulse').length;
  const monthEvents = month.length;

  const savingsRate = monthIncome > 0 ? Math.max(0, (monthIncome - monthSpend) / monthIncome) : 0;
  const metaVel = monthIncome > monthSpend ? Math.min(1, ((monthIncome - monthSpend) / (target / 24))) : 0;
  const dti = debtTotalRemaining(state) / Math.max(1, monthIncome * 12);

  // habit hit rate over last 14 days
  let hits = 0, slots = 0;
  state.habits.forEach(h => {
    for (let i = 0; i < 14; i++){
      slots++;
      const k = `${localDay(addDays(new Date(), -i))}::${h.id}`;
      if (state.habitHits[k]) hits++;
    }
  });
  const habitRate = slots ? hits/slots : 0;

  // capture regularity (days with at least 1 event last 7 days)
  const dayWith = new Set(week.map(e => localDay(e.occurredAt)));
  const captureReg = dayWith.size / 7;

  // streak depth: log of total active streak days normalized
  const totalStreak = state.habits.reduce((s,h) => s + streakFor(state, h.id), 0);
  const streakDepth = Math.min(1, Math.log10(1 + totalStreak) / 1.7);

  const recentImpulse = daysSinceLastImpulse(state);
  const recentRelapse = recentImpulse < 30 ? Math.max(0, 1 - recentImpulse/30) : 0;

  // count days over daily limit (last 14)
  let overDays = 0;
  for (let i = 0; i < 14; i++){
    const d = localDay(addDays(new Date(), -i));
    const sp = sumBy(state.events.filter(e => localDay(e.occurredAt) === d), e => e.kind === 'expense');
    if (sp > dailyLimit) overDays++;
  }
  const limitOver = overDays / 14;

  const capital = clamp(
    40 * savingsRate +
    30 * metaVel +
    20 * (1 - Math.min(1, dti)) +
    10 * 0   // emergency buffer — Alpha doesn't track separately
  );
  const discipline = clamp(
    40 * habitRate +
    30 * captureReg +
    20 * streakDepth +
    10 * 0   // weekly review — Alpha doesn't track yet
  );
  const antifuga = clamp(
    100
    - 30 * (monthEvents ? impulses/monthEvents : 0)
    - 30 * (monthSpend ? dangerSpend/monthSpend : 0)
    - 20 * recentRelapse
    - 20 * limitOver
  );

  const raw = 0.40*capital + 0.35*discipline + 0.25*antifuga;
  return {
    score: Math.round(clamp(raw)),
    pillars: { capital: Math.round(capital), discipline: Math.round(discipline), antifuga: Math.round(antifuga) },
    inputs: { savingsRate, metaVel, dti, habitRate, captureReg, streakDepth, recentImpulse, limitOver, monthSpend, monthIncome, dangerSpend, impulses, monthEvents }
  };
}

function clamp(n, lo=0, hi=100){ return Math.max(lo, Math.min(hi, n)); }

function buildSignals(state, stab){
  const out = [];
  const noImpulseDays = daysSinceLastImpulse(state);
  if (noImpulseDays >= 7) out.push({ txt: `${noImpulseDays} días sin impulsivos`, kind: 'green' });
  else if (noImpulseDays === 0) out.push({ txt: 'Impulso registrado hoy', kind: 'amber' });

  // domicilios trend
  const month = monthsEvents(state);
  const halfA = month.filter(e => daysBetween(e.occurredAt, new Date()) >= 15);
  const halfB = month.filter(e => daysBetween(e.occurredAt, new Date()) < 15);
  const domA = sumBy(halfA, e => e.kind === 'expense' && e.categorySlug === 'domicilios');
  const domB = sumBy(halfB, e => e.kind === 'expense' && e.categorySlug === 'domicilios');
  if (domA > 0){
    const delta = Math.round(((domB - domA)/domA)*100);
    if (delta < -5) out.push({ txt: `Domicilios ↓ ${Math.abs(delta)}%`, kind: 'green' });
    else if (delta > 10) out.push({ txt: `Domicilios ↑ ${delta}%`, kind: 'amber' });
  }
  if (stab.score >= 70) out.push({ txt: 'Semana estable', kind: 'blue' });
  if (stab.pillars.antifuga >= 75) out.push({ txt: 'Anti-fuga sólido', kind: 'green' });
  if (stab.inputs.savingsRate > 0.5) out.push({ txt: 'Flujo saludable', kind: 'green' });
  return out.slice(0, 6);
}

window.BOS = {
  KEY, DEFAULT_STATE,
  loadState, saveState, resetState,
  fmtCOP, fmtFull, parseAmount,
  localDay, localHour, dayPart, fmtTime, fmtDateHeader, addDays, daysBetween,
  todaysEvents, weeksEvents, monthsEvents, sumBy,
  streakFor, streakDays, daysSinceLastImpulse, metaProgress, debtTotalRemaining,
  computeStability, buildSignals, clamp,
};
