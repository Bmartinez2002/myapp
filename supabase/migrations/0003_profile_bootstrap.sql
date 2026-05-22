-- Auto-create profile + seed categories, habits, debts, projects on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));

  insert into public.categories (user_id, slug, name, emoji, kind, risk_tier) values
    (new.id, 'contrato',            'Contrato',             '💼', 'income',       'safe'),
    (new.id, 'servicio',            'Servicio',             '🛠️', 'income',       'safe'),
    (new.id, 'cafe',                'Café & desayuno',      '☕', 'expense',      'safe'),
    (new.id, 'gasolina',            'Gasolina',             '⛽', 'expense',      'safe'),
    (new.id, 'supermercado',        'Supermercado',         '🛒', 'expense',      'safe'),
    (new.id, 'domicilios',          'Domicilios',           '🍔', 'expense',      'danger'),
    (new.id, 'ropa',                'Ropa',                 '👕', 'expense',      'watch'),
    (new.id, 'salidas',             'Salidas / ocio',       '🍻', 'expense',      'watch'),
    (new.id, 'suscripciones',       'Suscripciones',        '🎬', 'expense',      'watch'),
    (new.id, 'novia',               'Novia · regalos',      '💝', 'expense',      'watch'),
    (new.id, 'compras-emocionales', 'Compras emocionales',  '📦', 'expense',      'danger'),
    (new.id, 'universidad',         'Universidad',          '🎓', 'expense',      'safe'),
    (new.id, 'deuda',               'Deuda · abono',        '💳', 'debt_payment', 'safe'),
    (new.id, 'transporte',          'Transporte',           '🚕', 'expense',      'safe');

  -- Hábitos reales de Brayan
  insert into public.habits (user_id, name, emoji, anti_fuga) values
    (new.id, 'Cero domicilios',          '🛡️', true),
    (new.id, 'Registrar gastos del día', '📝', false),
    (new.id, 'Lectura · 30 min',         '📚', false),
    (new.id, 'Gym',                      '💪', false),
    (new.id, 'Deep work · 2h',           '🧠', false);

  -- Deudas reales de Brayan (bigint cents = COP × 100)
  insert into public.debts (user_id, name, source, total_cents, rate_annual, due_at) values
    (new.id, 'Deuda familiar', 'familia',     2000000000, 0,    null),
    (new.id, 'Rapicredit',     'rapicredit',   948500000, 26.0, '2026-05-28'),
    (new.id, 'Solventa',       'solventa',     782000000, 22.0, '2026-06-04'),
    (new.id, 'Universidad',    'universidad', 1470000000, 0,    '2026-06-12');

  -- Proyectos reales de Brayan (bigint cents = COP × 100)
  insert into public.projects (user_id, code, name, client, value_cents, progress, deadline, stage) values
    (new.id, 'WP-019', 'Portal Alcaldía Pasto',  'Gobernación',    1840000000, 62, '2026-06-15', 'active'),
    (new.id, 'AUT-007','ERP Acme S.A.',           'Acme S.A.',       720000000, 18, '2026-06-30', 'discovery'),
    (new.id, 'WP-021', 'Landing Clínica Norte',   'Clínica Norte',   380000000, 84, '2026-05-28', 'active'),
    (new.id, 'IA-004', 'Chatbot · Inmobiliaria',  'BR Inmobiliaria', 540000000,  8, '2026-06-10', 'proposal');

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
