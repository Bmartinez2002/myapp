-- Row Level Security on every table
do $$
declare t text;
begin
  for t in select unnest(array[
    'profiles','categories','money_events','habits','habit_hits',
    'debts','debt_payments','projects','ai_briefings','daily_snapshots','weekly_reviews'
  ]) loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "owner" on %I', t);
  end loop;
end $$;

-- profiles uses id = auth.uid()
create policy "owner" on profiles for all
  using (id = auth.uid()) with check (id = auth.uid());

-- all others use user_id
create policy "owner" on categories     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner" on money_events   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner" on habits         for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner" on habit_hits     for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner" on debts          for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner" on debt_payments  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner" on projects       for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner" on ai_briefings   for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner" on daily_snapshots for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owner" on weekly_reviews for all using (user_id = auth.uid()) with check (user_id = auth.uid());
