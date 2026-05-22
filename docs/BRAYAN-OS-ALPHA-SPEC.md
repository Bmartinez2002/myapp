# BRAYAN OS · ALPHA · BUILD SPEC

> Hand-off document for the engineering build of BRAYAN OS Alpha.
> Stop designing. Start shipping.
> Single-user MVP for daily use (Brayan Martínez · Medellín · 23 · Ing. de Sistemas).

---

## 0 · NORTH STAR

**One sentence:**
A personal operating system that lets the user **open → capture → understand → act → close** in under 60 seconds, every day.

**Primary KPI of the product itself:**
*Days/week the user opens it and captures at least one event.* Target ≥ 6.

**Secondary KPIs:**
- p50 capture time < 8s
- AI briefing read-through ≥ 5×/week
- Weekly Review completed ≥ 3 of 4 weeks/month

**What it is NOT:**
- Not a fintech.
- Not a budgeting app.
- Not a habit tracker.
- Not a productivity app.

It is a **discipline + capital + clarity** system. Money control is the entry door, not the destination.

---

## 1 · STACK (locked)

| Layer | Tech | Notes |
|---|---|---|
| Frontend | **Next.js 15 (App Router)** + React 19 | RSC where it helps, client where it matters (capture, animations) |
| Styling | **Tailwind v4** + CSS variables tokens | No CSS-in-JS. Tokens live in `app/globals.css` |
| Motion | **Framer Motion** | Reserved for: capture confirmation, streak pulse, page transitions, AI typing |
| State | **Zustand** + URL state | No Redux. Server state via TanStack Query. |
| Backend | **Supabase** (Postgres + Auth + Realtime + Storage) | RLS on every table |
| AI | **OpenAI** (`gpt-5-mini` for briefings/insights, `gpt-5` for weekly review) | Server-only. Streaming via Next route handlers. |
| Mobile | **PWA** (manifest + service worker + installable) | iOS first. Capacitor wrapper later for App Store. |
| Hosting | **Vercel** | Edge functions for AI streaming |
| Errors | **Sentry** | Day-one |
| Analytics | **PostHog** | self-host eventually |
| Type-safety | **TypeScript strict** + **Zod** at every boundary | No `any`. |
| Dates / money | `date-fns-tz` (America/Bogota) + **integer cents** (COP, no decimals) | Never floats for money. |

**Hard rules:**
- All money is `bigint` cents in storage, formatted in display layer.
- All dates are stored UTC, displayed in `America/Bogota`.
- Every server action is wrapped in a Zod parser.
- No untyped Supabase calls — generate types via `supabase gen types typescript`.

---

## 2 · INFORMATION ARCHITECTURE (the entire MVP)

Only **7 surfaces**. If it doesn't fit in one of these, it doesn't ship in Alpha.

```
/                          → Today (default)
/capture                   → Quick Capture (modal-style sheet)
/meta                      → Meta 20M + Stability detail
/operator                  → AI Operator (chat + briefing history)
/ceo                       → CEO Mode (projects + pipeline)
/review                    → Weekly Review (story flow)
/settings                  → Account + categories + bank rules
```

**Mobile nav:** bottom tab bar with 5 slots — Today / Meta / [+ Capture FAB] / CEO / Review. Operator opens via the bell icon on Today and via swipe-down from Today.

**Desktop:** left rail + main pane (3-col layout: rail · content · context drawer). Identical content surfaces.

---

## 3 · DATA MODEL (Postgres / Supabase)

```sql
-- One user for Alpha; schema is multi-tenant ready.
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  city text,
  timezone text default 'America/Bogota',
  currency text default 'COP',
  meta_target_cents bigint default 2000000000, -- 20M COP
  daily_limit_cents bigint default 33000000,    -- 330K COP/day
  created_at timestamptz default now()
);

-- Categories: seeded per user, mutable.
create table categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles not null,
  slug text not null,                 -- 'domicilios','ropa', etc
  name text not null,
  emoji text,
  kind text not null check (kind in ('expense','income','transfer')),
  risk_tier text check (risk_tier in ('safe','watch','danger')),
  unique (user_id, slug)
);

-- Money events: gastos, ingresos, transferencias, abonos a deuda.
create table money_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles not null,
  occurred_at timestamptz not null default now(),
  kind text not null check (kind in ('expense','income','transfer','debt_payment','block')),
  amount_cents bigint not null,        -- always positive; sign derived from kind
  category_id uuid references categories,
  account text,                        -- 'bancolombia-ahorros' etc
  merchant text,
  need text check (need in ('necessary','impulse','protected','planned')),
  emotion_before text,                 -- 'craving','stress','boredom','celebration','calm', etc
  emotion_after_score smallint check (emotion_after_score between 1 and 5),
  note text,
  source text default 'manual',        -- 'manual','voice','bank-sync','rule'
  raw text,                            -- the voice/text input pre-parse
  created_at timestamptz default now()
);
create index on money_events (user_id, occurred_at desc);

-- Habits: very small surface — name + cadence + last hits.
create table habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles not null,
  name text not null,
  emoji text,
  cadence text default 'daily',        -- 'daily' for Alpha
  target_per_period int default 1,
  anti_fuga boolean default false,
  created_at timestamptz default now()
);

create table habit_hits (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits not null,
  user_id uuid references profiles not null,
  hit_date date not null,
  done boolean not null default true,
  unique (habit_id, hit_date)
);

-- Debts: simple, opinionated.
create table debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles not null,
  name text not null,
  source text,                         -- 'rapicredit','solventa','universidad','family'
  total_cents bigint not null,
  rate_annual numeric(5,2) default 0,
  due_at date,
  closed_at timestamptz,
  created_at timestamptz default now()
);

create table debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid references debts not null,
  user_id uuid references profiles not null,
  amount_cents bigint not null,
  paid_at timestamptz default now(),
  money_event_id uuid references money_events
);

-- CEO mode: tiny.
create table projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles not null,
  code text,                           -- 'WP-019'
  name text not null,
  client text,
  value_cents bigint default 0,
  stage text check (stage in ('lead','discovery','proposal','active','paused','won','lost')),
  progress smallint default 0,
  deadline date,
  created_at timestamptz default now()
);

-- AI briefings/insights cached so we don't re-bill OpenAI on every load.
create table ai_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles not null,
  kind text check (kind in ('daily','weekly','insight','simulation')),
  content_md text not null,            -- markdown body
  meta jsonb,                          -- {stability:72, delta:+6, ...}
  created_at timestamptz default now()
);
create index on ai_briefings (user_id, created_at desc);

-- Materialized daily snapshot — recomputed nightly + on event.
create table daily_snapshots (
  user_id uuid references profiles not null,
  on_date date not null,
  stability smallint,
  pillar_capital smallint,
  pillar_discipline smallint,
  pillar_antifuga smallint,
  spend_cents bigint default 0,
  income_cents bigint default 0,
  protected_cents bigint default 0,
  impulse_count int default 0,
  streak_clean_days int default 0,
  meta_progress_cents bigint default 0,
  primary key (user_id, on_date)
);
```

**RLS template (apply to every table):**
```sql
alter table money_events enable row level security;
create policy "owner" on money_events
  for all using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
```

---

## 4 · STABILITY INDEX (the formula)

A 0-100 daily score. Three pillars, weighted, with a 7-day EMA smoothing:

```
stability = round(
  0.40 * pillar_capital      // saving rate, meta velocity, debt-to-income
+ 0.35 * pillar_discipline   // habit hit rate, streak depth, capture frequency
+ 0.25 * pillar_antifuga     // impulse count, danger-category share, recovery time
)

Each pillar normalized to 0-100. EMA alpha = 0.3 (today weighs 30%, yesterday's EMA 70%).
```

**Pillar formulas (target this in `lib/stability.ts`):**

```ts
// CAPITAL — how well capital is accumulating
capital = clamp(
  40 * savingsRateMonth          // (income - expense) / income, 0..1
+ 30 * metaVelocityRatio          // monthly_savings / required_monthly_to_hit_meta
+ 20 * (1 - debtToIncome)         // debt_total / annualized_income
+ 10 * emergencyBufferMonths/3    // cash / monthly_expense, capped at 3
, 0, 100);

// DISCIPLINE — how well the operating system is run
discipline = clamp(
  40 * habitHitRate14d            // sum(done) / sum(target) over 14d
+ 30 * captureRegularity          // days_with_capture / 7
+ 20 * streakDepthScore           // log-scaled active streaks
+ 10 * weeklyReviewCompleted      // 0..1 over last 4 weeks
, 0, 100);

// ANTIFUGA — how leakproof the month is
antifuga = clamp(
  100
- 30 * impulseShareMonth          // impulse_count / event_count
- 30 * dangerCategoryShare        // spend_in_danger_categories / total_spend
- 20 * recentRelapseFactor        // days_since_last_impulse, inverse
- 20 * dailyLimitOvershoot        // days_over_limit / days_in_month
, 0, 100);
```

Stored in `daily_snapshots`. Recomputed:
1. Nightly cron (Vercel cron or pg_cron) at 04:00 America/Bogota.
2. On every `money_events` insert (debounced, via Supabase trigger → edge function).

---

## 5 · QUICK CAPTURE (the heart)

**The 3-second rule:** from "FAB tapped" to "amount entered" must be ≤ 3 seconds. From entered to saved must be ≤ 1 tap.

### 5.1 Flow

```
Step 1: AMOUNT
  - Default sheet opens with numpad focused
  - Smart parse from input: "48k" → 48,000; "1.2m" → 1,200,000
  - Voice mic button optional ("gasté cuarenta y ocho mil en un libro")

Step 2: CATEGORY + KIND (auto-guess from amount, merchant, time, history)
  - 6 chip suggestions, ranked by Bayesian probability
  - "Tap to confirm" — single tap saves draft
  - Long-press a chip → edit/remap

Step 3 (OPTIONAL, swipeable card): CONTEXT
  - need: necessary | impulse | planned | protected
  - emotion_before (chip grid)
  - emotion_after_score (1-5)
  - This step CAN be skipped — capture is saved without it.
  - Asking-for-context is opt-in based on (a) impulse heuristic, (b) user setting.
```

### 5.2 Heuristic: when to ASK for context

```ts
function shouldAskContext(event, history) {
  if (event.amount_cents >= history.medianExpense * 2) return true;
  if (event.category.risk_tier === 'danger') return true;
  if (now - history.lastImpulse < 24h) return true;
  if (history.dayOfWeek === 5 && now.hour >= 18) return true; // friday night
  return false;
}
```

### 5.3 Voice parse contract

`POST /api/capture/parse`
Body: `{ text: string, locale: 'es-CO' }`
Returns:
```json
{
  "amount_cents": 4800000,
  "merchant": "librería",
  "category_slug": "compras-emocionales",
  "confidence": 0.78,
  "needs_confirmation": true
}
```

Implementation: structured output via OpenAI `response_format: json_schema`. Cached for 24h on identical input.

### 5.4 Keyboard shortcuts (desktop & PWA install)

- `⌘K` opens capture
- `G` expense · `I` income · `H` habit · `T` task · `N` note · `D` idea
- `⏎` save · `Esc` cancel · `?` toggle context

---

## 6 · AI OPERATOR

Not a chatbot. Three concrete jobs:

### 6.1 Daily Briefing (06:30 America/Bogota)

Cron job → reads `daily_snapshots` for last 14 days + open debts + this week's commitments → calls `gpt-5-mini` with the system prompt below → stores in `ai_briefings` → push notification.

```
SYSTEM
You are the BRAYAN OS Operator. Job: produce a 60-second morning briefing in es-CO.
Tone: direct, warm, not corporate. Never motivational fluff. Always specific.
Constraints:
- ≤ 120 words.
- 1 sentence about state, 1-2 actions (with $ or % concrete), 1 risk if any.
- Reference real numbers from the data — never invent.
- Avoid: "great job!", "keep it up", emojis, exclamations.

USER
state: {stability:72, delta:+6, streak_clean:18, meta_progress:0.241}
today_due: [{kind:'debt', name:'Rapicredit', amount_cents:45000000, due:'2026-05-28'}]
recent_leak: {category:'compras_emocionales', count_7d:1, amount_cents:4800000}
calendar_risk: 'viernes_noche'
```

Sample output (good):
> Sistema estable, +6 puntos en 7 días. La racha 18 está sólida — viernes es la prueba.
> Hoy: abonar $450K a Rapicredit (vence el 28, ahorras ~$94K en intereses).
> Una recaída esta semana: libro impulsivo $48K. No la repitas.

### 6.2 Insights (on-demand from Today)

`GET /api/operator/insight?topic=auto` — returns 1 specific observation based on the last 30 days. Cached 6h.

System prompt focuses on patterns:
- Same-category repeat impulses
- Day-of-week leak patterns
- Stability trajectory
- Meta velocity projections

### 6.3 Simulations

`POST /api/operator/simulate`
Body: `{ scenario: 'skip_debt_payment' | 'cut_subscription' | 'raise_income' | 'free' , params: {...} }`
Returns markdown + a meta object with deltas.

Each simulation must show **3 numbers**:
- $ impact (cents)
- stability_delta (signed integer)
- days_to_meta_delta (signed integer)

---

## 7 · WEEKLY REVIEW (story flow)

6 cards, swipeable (mobile) or step-buttoned (desktop). 5 minutes to complete.

1. **State** — Stability this week vs last, top 3 deltas.
2. **What worked** — auto-detected from data: 3-4 wins.
3. **What slipped** — auto-detected: 2-3 misses + amounts.
4. **The number** — Hero stat: money protected this week.
5. **Reflection** — Free-text + emotion picker (3 swipes).
6. **Next week** — 3-5 commitments, each tagged + XP estimate. Saved as scheduled events.

Compute "wins" and "misses" server-side: rank by signed contribution to weekly stability delta.

---

## 8 · CEO MODE (kept tiny on purpose)

Just **projects** with pipeline stages. No CRM. No invoices. No tasks-per-project (yet).

Single page:
- Pipeline stacked bar (Lead / Discovery / Proposal / Active / Won)
- Project list with: code, name, client, value, stage, progress, deadline
- Inline edit on click

That's it for Alpha. Resist scope creep.

---

## 9 · COMPONENTS LIBRARY (build first, then screens)

`/components/ui` (atomic):
- `Card`, `StatCard`, `Bar`, `Donut`, `Pill`, `Chip`, `Button`, `IconButton`
- `MoneyAmount` (formats cents → `$1.2M` / `$340K` / `$48K`)
- `RelTime` (formats timestamps "hace 2h", "ayer 18:30")

`/components/feature`:
- `CaptureSheet` (the full quick capture flow)
- `StabilityRing` (animated ring 0-100)
- `MetaTrajectory` (real + projection SVG chart)
- `TodayFeed` (cronological timeline grouped by daypart)
- `StreakBar` (the 30-cell streak visualization)
- `OperatorMessage` (AI message bubble with markdown)
- `Signal` (the small status pill: "7 días sin impulsos")

Naming convention: every primitive lives in its own file, exported as default, with a colocated `.stories.tsx` placeholder for later.

---

## 10 · FILE LAYOUT

```
brayan-os/
├─ app/
│  ├─ (auth)/login/page.tsx
│  ├─ (app)/
│  │  ├─ layout.tsx            # rail + bottom tabs
│  │  ├─ page.tsx              # Today
│  │  ├─ capture/page.tsx      # full-screen on mobile, sheet on desktop
│  │  ├─ meta/page.tsx
│  │  ├─ operator/page.tsx
│  │  ├─ ceo/page.tsx
│  │  ├─ review/page.tsx
│  │  └─ settings/page.tsx
│  ├─ api/
│  │  ├─ capture/parse/route.ts
│  │  ├─ operator/briefing/route.ts
│  │  ├─ operator/insight/route.ts
│  │  ├─ operator/simulate/route.ts
│  │  └─ cron/daily-snapshot/route.ts
│  └─ globals.css
├─ components/
│  ├─ ui/
│  └─ feature/
├─ lib/
│  ├─ supabase/{server,client}.ts
│  ├─ openai.ts
│  ├─ stability.ts             # the formula
│  ├─ money.ts                 # cents helpers
│  ├─ dates.ts                 # America/Bogota helpers
│  ├─ parse-amount.ts          # "48k" → 4800000
│  └─ schemas.ts               # zod schemas (single source of truth)
├─ stores/
│  └─ ui.ts                    # zustand: capture sheet open, current step
├─ public/
│  ├─ manifest.webmanifest
│  └─ icons/...
├─ supabase/
│  ├─ migrations/
│  └─ seed.sql
└─ middleware.ts               # auth guard
```

---

## 11 · DESIGN TOKENS (paste into `app/globals.css`)

```css
@theme {
  --color-bg-0: oklch(0.135 0.005 250);
  --color-bg-1: oklch(0.175 0.006 250);
  --color-bg-2: oklch(0.215 0.008 250);
  --color-hair: oklch(0.28 0.008 250 / .9);
  --color-fg:   oklch(0.975 0.004 250);
  --color-fg-2: oklch(0.78 0.005 250);
  --color-fg-3: oklch(0.58 0.005 250);
  --color-fg-4: oklch(0.42 0.005 250);
  --color-accent:   oklch(0.85 0.18 150);
  --color-accent-2: oklch(0.72 0.17 250);
  --color-warn:     oklch(0.82 0.16 80);
  --color-danger:   oklch(0.7 0.2 25);
  --font-sans: 'Geist', ui-sans-serif, system-ui;
  --font-mono: 'Geist Mono', ui-monospace;
  --radius-card: 14px;
  --radius-chip: 99px;
}
```

Numbers always in `font-mono` with `font-variant-numeric: tabular-nums`.

---

## 12 · MILESTONES (ship in order; do not parallelize)

### **M0 · Foundation (week 1)**
- [ ] Next.js + Tailwind + Supabase + types generated
- [ ] Auth (email magic link)
- [ ] Schema migrations + seed (Brayan's categories, debts, target)
- [ ] `globals.css` tokens, primitives, base layout (rail + tabs)
- [ ] PWA manifest + installable

### **M1 · Capture (week 2)**
- [ ] `CaptureSheet` end-to-end (amount → category → save)
- [ ] `parse-amount` lib + tests
- [ ] `/api/capture/parse` voice-text endpoint (no audio yet, just text)
- [ ] Inserts into `money_events`, RLS verified

### **M2 · Today (week 3)**
- [ ] Stability formula → `lib/stability.ts` + unit tests
- [ ] Daily snapshot cron job
- [ ] Today feed grouped by daypart
- [ ] Signals strip (computed from snapshot)
- [ ] Day pacing bar (vs daily limit)

### **M3 · Meta + Operator (week 4)**
- [ ] Meta page with trajectory chart (real + projection)
- [ ] Daily Briefing cron + push notifications
- [ ] Operator chat surface (just briefing history at first)
- [ ] On-demand insight endpoint

### **M4 · Discipline + CEO (week 5)**
- [ ] Habits CRUD + heatmap
- [ ] Streak engine
- [ ] CEO Mode (projects table + pipeline bar)

### **M5 · Weekly Review (week 6)**
- [ ] 6-step story flow
- [ ] Auto-detected wins/misses (signed contribution rank)
- [ ] Reflection + commitments
- [ ] Saved review history

### **M6 · Polish + dogfood (week 7-8)**
- [ ] Framer Motion: capture confirm, streak pulse, page transitions
- [ ] Empty states + onboarding
- [ ] Sentry + PostHog
- [ ] Daily use for 14 days, fix friction

**Anything not in M0-M6 is post-Alpha.** Period.

---

## 13 · ANTI-SCOPE LIST (will NOT ship in Alpha)

- ❌ Multi-user / sharing
- ❌ Bank sync / Plaid / Belvo
- ❌ Investment tracking
- ❌ Skill tree (move to v0.2)
- ❌ Achievements gallery (move to v0.2)
- ❌ Multiple currencies
- ❌ Themes / customization
- ❌ Notion / Google Cal sync
- ❌ Web scraping receipts
- ❌ Family / partner accounts

If any of these are tempting mid-build, write them in `/docs/v0.2-ideas.md` and stop.

---

## 14 · GETTING STARTED (commands)

```bash
npx create-next-app@latest brayan-os --typescript --tailwind --app --src-dir=false --import-alias="@/*"
cd brayan-os
pnpm add @supabase/ssr @supabase/supabase-js openai zustand zod framer-motion date-fns-tz @tanstack/react-query
pnpm add -D @types/node supabase
npx supabase init
npx supabase start
# put migrations in supabase/migrations, run:
npx supabase db reset
npx supabase gen types typescript --local > lib/supabase/types.ts
```

Env:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
OPENAI_API_KEY=...
CRON_SECRET=...
```

---

## 15 · ACCEPTANCE CHECKLIST (Alpha is done when)

- [ ] I can install the PWA on my iPhone.
- [ ] Opening it shows Today in < 1s on warm cache.
- [ ] I can capture a gasto in < 8s (median over 20 captures).
- [ ] Stability Index updates after every capture without a manual refresh.
- [ ] Every morning at 06:30 I get a notification with a real, specific briefing.
- [ ] I can ask the Operator one freeform question and get a useful answer.
- [ ] Weekly Review takes ≤ 5 minutes and leaves me with 3-5 commitments.
- [ ] I've used it daily for 14 consecutive days without forking the schema.
- [ ] No crashes. Sentry shows < 0.1% error rate.

---

## 16 · HAND-OFF PROMPT (for Claude Code / build agent)

Copy this block, paste into Claude Code at the repo root:

```
Build BRAYAN OS Alpha following the spec in /docs/BRAYAN-OS-ALPHA-SPEC.md.

Rules:
1. Read the entire spec before writing code.
2. Ship in milestone order (M0 → M6). Do not skip ahead.
3. After each milestone, run typecheck + lint + tests and report.
4. Use exactly the stack listed in §1. Do not substitute.
5. All money is bigint cents. All dates store UTC, display America/Bogota.
6. Every server route validates input with Zod from /lib/schemas.ts.
7. RLS on every table. Verify with a test.
8. Reference the existing design system in /Brayan OS Mobile.html for visual fidelity — match the dark ink + green/blue accents + Geist + Geist Mono treatment.
9. When in doubt, choose the smaller surface. The anti-scope list (§13) is binding.
10. Daily commits. Conventional commit messages.

Start with M0. When M0 acceptance criteria are met, proceed to M1.
```

---

*BRAYAN OS Alpha — stops being a concept, starts being a tool.*
