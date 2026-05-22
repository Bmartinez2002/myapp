# BRAYAN OS · ALPHA

Sistema operativo personal. Mobile-first PWA, desktop como bonus.
Stack: Next.js 15 · Tailwind v4 · Supabase · OpenAI · Framer Motion.

## Setup en 5 minutos

```bash
# 1 · instalar
pnpm install   # o npm install

# 2 · Supabase local (Docker requerido)
npx supabase start
npx supabase db reset   # corre las migraciones 0001 → 0003
npx supabase gen types typescript --local > lib/supabase/types.ts

# 3 · variables
cp .env.example .env.local
# pega los valores que supabase start imprimió + tu OPENAI_API_KEY

# 4 · arrancar
pnpm dev
```

## Primer uso

1. Abre http://localhost:3000 → `/login`.
2. Mete tu correo. Para dev: revisa `http://localhost:54324` (Inbucket) y abre el magic link.
3. El trigger `handle_new_user` te crea perfil + 14 categorías seed.
4. Toca el botón verde central → registra tu primer gasto en 5 segundos.

## Instalar como PWA (iPhone)

Safari → Compartir → "Agregar a pantalla de inicio". Se ve como app nativa, splash screen incluido.

## Estructura

```
app/
  (app)/            # rutas autenticadas (Today, Meta, Operator, CEO, Review, Settings, Capture)
  login/            # pública
  auth/callback/    # OAuth callback
  api/              # parse, briefing, simulate, cron/daily-snapshot
  actions/          # server actions (capture, auth)
components/
  ui/               # primitivos (Card, Pill, Bar, Ring, Icon, MoneyAmount, RelTime)
  feature/          # CaptureSheet, TabBar
lib/
  money.ts          # cents helpers
  dates.ts          # America/Bogota helpers
  parse-amount.ts   # "48k" → 48000
  stability.ts      # la fórmula
  schemas.ts        # Zod en cada borde
  supabase/         # client.ts, server.ts
  openai.ts
supabase/
  migrations/       # 0001_init, 0002_rls, 0003_profile_bootstrap
```

## Reglas duras

- Todo el dinero es `bigint` cents en la DB.
- Todas las fechas se guardan UTC, se muestran en `America/Bogota`.
- Cada server route valida con Zod.
- RLS habilitado en TODAS las tablas (ya está en migración 0002).
- No `any` en TypeScript. `pnpm typecheck` debe pasar.

## Mobile-first

- Layout principal: bottom tab bar fija + FAB central verde.
- Desktop: rail izquierdo se activa en `md:` (768px+).
- Safe areas via `env(safe-area-inset-bottom)` ya configuradas en TabBar.

## Cron · daily snapshot

Configura un cron de Vercel en `vercel.json`:

```json
{
  "crons": [
    { "path": "/api/cron/daily-snapshot", "schedule": "0 9 * * *" }
  ]
}
```

(9:00 UTC = 4:00 AM America/Bogota.)

## Cosas que NO ship en Alpha (anti-scope)

Skill Tree · Achievements · Bank sync · Multi-user · Themes · Tasks · Notas.
Si te tienta agregarlo, escribe en `docs/v0.2-ideas.md` y para.

## Hand-off prompt

Pega el contenido de `HANDOFF.md` en Claude Code y déjalo trabajar milestone por milestone.
