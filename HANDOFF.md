# BRAYAN OS · HAND-OFF para Claude Code / Codex

> Pega este documento en tu agente de build en la raíz de `brayan-os/`.
> Objetivo: convertir el scaffold actual en un **SaaS funcional 1:1 con el standalone PWA** que vive en `/docs/design-reference/standalone/`.

---

## 0 · Verdad absoluta

Hay **tres fuentes de verdad** en este orden:

1. **`/docs/design-reference/standalone/Brayan OS App.html`** + sus `.jsx` y `.js` — **ESTE es el producto a replicar**. Es la versión PWA funcional que el usuario ya está usando. Layout, comportamiento, datos, fórmulas, flujos: idénticos.
2. `/docs/design-reference/Brayan OS Mobile.html` — referencia visual de los 11 mockups móviles (con frames iOS).
3. `/docs/design-reference/Brayan OS.html` — referencia visual desktop.

Si dudas, abre el `.jsx` correspondiente del standalone y cópialo. **No reinventes nada.**

---

## 1 · Las 11 pantallas (matching exacto)

| # | Standalone screen | Next.js route | Tab | Source file |
|---|---|---|---|---|
| 1 | LockScreen        | `/lock`             | overlay (1x día) | `bos-screens-extra.jsx` |
| 2 | HomeScreen        | `/`                 | Home   | `bos-screens.jsx` |
| 3 | TodayScreen       | `/today`            | Today  | `bos-screens-extra.jsx` |
| 4 | CaptureSheet      | `/capture`          | FAB    | `bos-screens.jsx` |
| 5 | MetaScreen        | `/meta`             | Meta   | `bos-screens.jsx` |
| 6 | HabitsScreen      | `/habits`           | from More | `bos-screens.jsx` |
| 7 | FugaScreen        | `/anti-fuga`        | from More | `bos-screens-extra.jsx` |
| 8 | CeoScreen         | `/ceo`              | from More | `bos-screens-extra.jsx` |
| 9 | WeeklyScreen      | `/review`           | from More | `bos-screens-extra.jsx` |
| 10 | OperatorScreen   | `/operator`         | from More | `bos-screens.jsx` |
| 11 | MoreScreen + Settings | `/more`, `/settings` | Más | `bos-screens-extra.jsx` |

**Tab bar (mobile):** Home · Today · [+FAB Capture] · Meta · Más — idéntico al standalone.

**Lock screen:** se muestra UNA vez al día en el primer login. Persistir `lastLockSeen` en `profiles.prefs`.

---

## 2 · Reglas duras (no negociables)

1. **Stack:** Next.js 15 (App Router), TypeScript strict, Tailwind v4, Supabase, OpenAI (`gpt-4o-mini` briefings, `gpt-4o` weekly), Framer Motion. No sustituyas.
2. **Money:** `bigint` cents en DB. Helpers en `lib/money.ts` (ya están).
3. **Dates:** UTC en DB, `America/Bogota` en UI. Helpers en `lib/dates.ts`.
4. **Validación:** Zod en TODA server action y route handler desde `lib/schemas.ts`.
5. **RLS:** en cada tabla. Verifica con test.
6. **TypeScript strict.** `pnpm typecheck && pnpm lint && pnpm test` debe pasar siempre.
7. **Mobile-first.** Si un fix solo funciona en desktop, está mal.
8. **NO inventes diseño.** Si el standalone hace algo, replícalo. Si no lo hace, no lo agregues.

---

## 3 · Mapping de cómputos (replicar idéntico)

### 3.1 Stability Index
**Fórmula EXACTA en `lib/stability.ts`** (idéntica a `bos-store.js` → `computeStability`):

```
stability = 0.40 * capital + 0.35 * discipline + 0.25 * antifuga

capital     = 40 * savingsRate + 30 * metaVelocity + 20*(1-debtToIncome) + 10*emergencyBuffer
discipline  = 40 * habitRate14d + 30 * captureRegularity7d + 20 * streakDepth + 10 * weeklyReviewRate
antifuga    = 100 - 30*impulseShare - 30*dangerCategoryShare - 20*recentRelapseFactor - 20*dailyLimitOvershoot
```

Inputs en `daily_snapshots` table, recomputados:
- Cron nightly 04:00 América/Bogotá (Vercel cron)
- On-demand al hacer `INSERT` en `money_events` (Supabase trigger → edge function)

### 3.2 Streaks
Idéntico al standalone `streakFor(state, habitId)`:
- Cuenta días consecutivos hacia atrás desde hoy.
- Si hoy no está marcado, NO rompe la racha (skip).
- Para el cómputo de "siguiente día" usa `localDay()` con TZ Bogotá.

### 3.3 Meta progress
`saved = sum(income) - sum(expense)` sobre todos los events. Mismo cálculo en `metaProgress(state)` del standalone.

### 3.4 Próximas acciones
Auto-generadas en `/` (Home):
1. Hábitos antifuga sin marcar hoy (P0)
2. Deudas próximas a vencer < 30d (P0 si <7d, P1 sino)
3. Si no hay capturas hoy: prompt para registrar primero movimiento (P1)

### 3.5 Wins/Misses (Weekly Review)
Auto-detect server-side desde la última semana:
- Wins: 0 impulsos + N gastos / hábitos con ≥5 hits / dinero ahorrado positivo
- Misses: impulsos detectados (con total $) / hábitos con ≤2 hits / categorías peligrosas con incremento

---

## 4 · Migraciones de DB (agregar a las existentes)

Crea `supabase/migrations/0004_extras.sql` con:

```sql
-- Projects (CEO Mode)
create table if not exists projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  code text,
  name text not null,
  client text,
  value_cents bigint default 0,
  stage text check (stage in ('lead','discovery','proposal','active','paused','won','lost')),
  progress smallint default 0,
  deadline date,
  created_at timestamptz default now()
);

-- Weekly Reviews
create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  week_start date not null,
  reflection text,
  word text,
  commitments jsonb,
  stability smallint,
  closed_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, week_start)
);

-- Prefs en profiles
alter table profiles add column if not exists prefs jsonb default '{}'::jsonb;

-- RLS
alter table projects enable row level security;
create policy "owner" on projects for all using (user_id = auth.uid()) with check (user_id = auth.uid());
alter table weekly_reviews enable row level security;
create policy "owner" on weekly_reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());
```

Y en `0003_profile_bootstrap.sql` agrega después del INSERT de categories:

```sql
-- Seed projects from standalone defaults
insert into projects (user_id, code, name, client, value_cents, progress, deadline, stage) values
  (new.id, 'WP-019', 'Portal Alcaldía Pasto',    'Gobernación',     1840000000, 62, '2026-06-15', 'active'),
  (new.id, 'AUT-007','ERP Acme S.A.',            'Acme S.A.',        720000000, 18, '2026-06-30', 'discovery'),
  (new.id, 'WP-021', 'Landing Clínica Norte',    'Clínica Norte',    380000000, 84, '2026-05-28', 'active'),
  (new.id, 'IA-004', 'Chatbot · Inmobiliaria',   'BR Inmobiliaria',  540000000,  8, '2026-06-10', 'proposal');

-- Seed debts (Brayan's reales)
insert into debts (user_id, name, source, total_cents, paid_cents, rate_annual, due_at) values
  (new.id, 'Deuda familiar', 'familia',     2000000000, 0,  0,   null),
  (new.id, 'Rapicredit',     'rapicredit',   948500000, 0, 26.0, '2026-05-28'),
  (new.id, 'Solventa',       'solventa',     782000000, 0, 22.0, '2026-06-04'),
  (new.id, 'Universidad',    'universidad', 1470000000, 0,  0,   '2026-06-12');

-- Seed habits (Brayan's reales)
insert into habits (user_id, name, emoji, anti_fuga) values
  (new.id, 'Cero domicilios',         '🛡️', true),
  (new.id, 'Registrar gastos del día','📝', false),
  (new.id, 'Lectura · 30 min',        '📚', false),
  (new.id, 'Gym',                     '💪', false),
  (new.id, 'Deep work · 2h',          '🧠', false);
```

---

## 5 · Tokens visuales (ya están en `globals.css`)

NO los cambies. Verifica que coincidan con el standalone:

```
--color-bg-0: oklch(0.10 0.005 250)   ← mobile más oscuro que desktop
--color-accent: oklch(0.85 0.18 150)
--color-accent-2: oklch(0.72 0.17 250)
```

**Cards:**
- Mobile: `border-radius: 18px`, padding `16-18px`
- Desktop: `border-radius: 14px`, padding `18-22px`

**Glow del hero (igual al standalone):**
```css
box-shadow: 0 0 0 1px oklch(.85 .18 150 / .12), 0 20px 50px -20px oklch(.85 .18 150 / .35);
/* + radial absolute en top-right 180px */
```

**Tab bar:** flotante, `bottom: 12px`, safe-area-inset-bottom, blur 18px, FAB central glow.

---

## 6 · Milestones (en orden)

### M0 · ya hecho (scaffold inicial)
Ya está: Next 15 + Tailwind + Supabase + auth magic link + layout móvil/desktop.

### M1 · Capture · 2 días
- `/capture` con CaptureSheet idéntico al standalone (3 pasos, keypad, k/m suffix, emoción + impulso).
- Server action `saveCapture` valida con Zod y persiste.
- Auto-marca hábito "registrar gastos del día" tras primer gasto del día.
- ⌘K + atajos `G/I/H` desde desktop.
- Tests: `lib/parse-amount.ts` y `lib/money.ts` (mínimo 12 casos cada uno).

### M2 · Today + Stability · 4 días
- `/today` feed mañana/tarde/noche con day pacing bar.
- `lib/stability.ts` con tests (mín 15 casos).
- Cron `/api/cron/daily-snapshot` idempotente (upsert), corre 4am COL.
- Home hero consume `daily_snapshots`.

### M3 · Meta · 3 días
- `/meta` con Ring + trajectory chart SVG (real + proyección punteada).
- Niveles RPG: 1M / 5M / 10M / 20M cards.
- Sección Deuda activa.

### M4 · Disciplina · 3 días
- `/habits` con hero 🔥 78px + 30-cell streak bar.
- Grid 2x2 mini-streaks tocables (toggle inline).
- Microrecompensas auto-generadas del día.

### M5 · Anti-fuga · 3 días
- `/anti-fuga` con FugaDial + breakdown por categoría peligrosa.
- Heatmap calor 4 semanas.
- Toggle "modo blindaje" (solo UI por ahora, persistir en prefs).

### M6 · CEO Mode · 2 días
- `/ceo` con pipeline stacked bar + lista proyectos.
- Tap proyecto → cycle stage.

### M7 · Weekly Review · 4 días
- `/review` story flow 6 cards swipeable.
- Auto-detect wins/misses server-side.
- Guarda en `weekly_reviews`.

### M8 · AI Operator · 4 días
- `/operator` chat real con OpenAI streaming.
- Daily briefing cron 06:30 → push notification (Web Push).
- `LockScreen` overlay 1x al día (component, no route).
- On-demand insight endpoint con cache 6h.

### M9 · Settings + Polish · 3 días
- `/settings` perfil + sliders + export/import JSON.
- Framer Motion en: capture confirm, page transitions, streak pulse, ring fill.
- Sentry + PostHog.
- Lighthouse PWA score ≥ 90.

---

## 7 · Checklist 1:1 vs standalone

Al cerrar cada milestone, **abre el `.jsx` standalone correspondiente y compara visualmente lado a lado**. Pega screenshots BEFORE/AFTER en `/docs/audit/M<n>/`.

Mínimo 100% match en:
- [ ] Colors (tokens idénticos)
- [ ] Type scale (Geist + Geist Mono, `tabular-nums` en cifras)
- [ ] Card radius mobile 18 / desktop 14
- [ ] Hero glow + corner radial
- [ ] FAB central + tab bar flotante con safe-area
- [ ] Micro labels 10.5px uppercase letter-spacing .14em
- [ ] Pillars con grados A+/A/B+/etc (NO números crudos)
- [ ] Streak bar 30 celdas verticales
- [ ] Trajectory chart con real + proyección punteada
- [ ] Pipeline stacked bar 5 stages
- [ ] Story flow 6 progress bars arriba

---

## 8 · Antes de cada commit

```bash
pnpm typecheck && pnpm lint && pnpm test
```

Conventional commits en español:
- `feat(capture): keypad con k/m suffix`
- `feat(stability): pillares con grados A+/A/B+`
- `fix(tabbar): safe-area-inset-bottom`

Al cerrar milestone:
1. `pnpm build` debe pasar.
2. Resume en `docs/log/M<n>.md`.
3. Espera review antes del siguiente.

---

## 9 · Reglas absolutas

❌ No agregues features que no estén en el standalone.
❌ No cambies colores, radios, espaciados.
❌ No inventes copy nuevo.
❌ No agregues integraciones externas (bank sync, Plaid, etc.).
❌ No multi-user, no themes, no skill tree.

✅ Mobile-first siempre.
✅ Datos reales del usuario en cada cómputo.
✅ Cada hábito marcado, cada captura, cada review modifican Stability.
✅ Si el standalone lo hace, lo haces. Si no, no.

---

## 10 · Para empezar

```
Empieza por M1. Lee `/docs/design-reference/standalone/bos-screens.jsx` función `CaptureSheet` y replícala en React Server Components donde aplique + Client Components donde aplique.

Cuando termines M1: corre los 3 comandos, sube screenshots, espera review.

Responde "leído, empezando M1" cuando termines de leer este documento.
```
