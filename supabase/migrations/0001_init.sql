-- BRAYAN OS · core schema · M0
-- All money is bigint cents. All datetimes UTC.

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  city text,
  timezone text default 'America/Bogota',
  currency text default 'COP',
  meta_target_cents bigint default 2000000000,
  daily_limit_cents bigint default 33000000,
  created_at timestamptz default now()
);

create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  slug text not null,
  name text not null,
  emoji text,
  kind text not null check (kind in ('expense','income','transfer')),
  risk_tier text check (risk_tier in ('safe','watch','danger')),
  created_at timestamptz default now(),
  unique (user_id, slug)
);

create table if not exists money_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  occurred_at timestamptz not null default now(),
  kind text not null check (kind in ('expense','income','transfer','debt_payment','block')),
  amount_cents bigint not null check (amount_cents >= 0),
  category_id uuid references categories on delete set null,
  account text,
  merchant text,
  need text check (need in ('necessary','impulse','protected','planned')),
  emotion_before text,
  emotion_after_score smallint check (emotion_after_score between 1 and 5),
  note text,
  source text default 'manual',
  raw text,
  created_at timestamptz default now()
);
create index if not exists money_events_user_time on money_events (user_id, occurred_at desc);

create table if not exists habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  name text not null,
  emoji text,
  cadence text default 'daily',
  target_per_period int default 1,
  anti_fuga boolean default false,
  created_at timestamptz default now()
);

create table if not exists habit_hits (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid references habits on delete cascade not null,
  user_id uuid references profiles on delete cascade not null,
  hit_date date not null,
  done boolean not null default true,
  unique (habit_id, hit_date)
);

create table if not exists debts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  name text not null,
  source text,
  total_cents bigint not null,
  rate_annual numeric(5,2) default 0,
  due_at date,
  closed_at timestamptz,
  created_at timestamptz default now()
);

create table if not exists debt_payments (
  id uuid primary key default gen_random_uuid(),
  debt_id uuid references debts on delete cascade not null,
  user_id uuid references profiles on delete cascade not null,
  amount_cents bigint not null,
  paid_at timestamptz default now(),
  money_event_id uuid references money_events on delete set null
);

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

create table if not exists ai_briefings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  kind text check (kind in ('daily','weekly','insight','simulation')),
  content_md text not null,
  meta jsonb,
  created_at timestamptz default now()
);
create index if not exists ai_briefings_user_time on ai_briefings (user_id, created_at desc);

create table if not exists daily_snapshots (
  user_id uuid references profiles on delete cascade not null,
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

create table if not exists weekly_reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade not null,
  week_start date not null,
  reflection text,
  word text,
  commitments jsonb,
  closed_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, week_start)
);
