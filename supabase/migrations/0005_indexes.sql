-- Performance indexes for hot query paths

create index if not exists idx_money_events_user_occurred
  on money_events(user_id, occurred_at desc);

create index if not exists idx_money_events_user_kind
  on money_events(user_id, kind);

create index if not exists idx_money_events_user_need
  on money_events(user_id, need) where need is not null;

create index if not exists idx_habit_hits_user_date
  on habit_hits(user_id, hit_date desc);

create index if not exists idx_habit_hits_habit_date
  on habit_hits(habit_id, hit_date desc);

create index if not exists idx_daily_snapshots_user_date
  on daily_snapshots(user_id, on_date desc);

create index if not exists idx_debts_user_closed
  on debts(user_id, closed_at) where closed_at is null;

create index if not exists idx_weekly_reviews_user_week
  on weekly_reviews(user_id, week_start desc);
