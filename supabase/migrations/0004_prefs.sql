-- Add prefs jsonb column to profiles for user preferences (e.g. blindaje toggle)
alter table profiles add column if not exists prefs jsonb default '{}'::jsonb;
