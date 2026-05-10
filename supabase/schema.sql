-- =====================================================================
-- PCamp Points Vix — Schema inicial
-- Rode esse arquivo inteiro no SQL Editor do Supabase.
-- =====================================================================

-- ===== Tabela: events =====
-- Cada Pocket é um evento com um código único.
-- "active" controla se o código está aceitando check-ins agora.
create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  name text not null,
  event_date date,
  location text,
  speakers text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create index if not exists idx_events_code on public.events (code);
create index if not exists idx_events_active on public.events (active);

-- ===== Tabela: users =====
-- Identificação por celular (chave de negócio em phone_key, só dígitos).
create table if not exists public.users (
  id uuid primary key default gen_random_uuid(),
  phone_key text unique not null,
  phone_formatted text not null,
  name text not null,
  created_at timestamptz not null default now(),
  last_seen timestamptz not null default now()
);

create index if not exists idx_users_phone_key on public.users (phone_key);

-- ===== Tabela: checkins =====
-- Cada presença em um evento gera um registro aqui.
-- Constraint UNIQUE evita ponto duplicado no mesmo evento.
create table if not exists public.checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  event_id uuid not null references public.events(id) on delete cascade,
  event_code text not null,
  points int not null default 1,
  created_at timestamptz not null default now(),
  unique (user_id, event_id)
);

create index if not exists idx_checkins_user on public.checkins (user_id);
create index if not exists idx_checkins_event on public.checkins (event_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
-- A LP usa a anon_key (chave pública). Configuramos RLS pra permitir
-- somente as operações estritamente necessárias do fluxo.
-- =====================================================================

alter table public.events enable row level security;
alter table public.users enable row level security;
alter table public.checkins enable row level security;

-- ===== events: anon pode LER eventos ativos =====
drop policy if exists "anon read active events" on public.events;
create policy "anon read active events"
  on public.events for select
  to anon
  using (active = true);

-- ===== users: anon pode INSERIR e LER por phone_key (necessário pro upsert do checkin) =====
drop policy if exists "anon insert users" on public.users;
create policy "anon insert users"
  on public.users for insert
  to anon
  with check (true);

drop policy if exists "anon select users" on public.users;
create policy "anon select users"
  on public.users for select
  to anon
  using (true);

drop policy if exists "anon update users" on public.users;
create policy "anon update users"
  on public.users for update
  to anon
  using (true)
  with check (true);

-- ===== checkins: anon pode INSERIR e LER seus próprios checkins =====
-- (sem auth real, então todos podem ler — ranking é "público" por design)
drop policy if exists "anon insert checkins" on public.checkins;
create policy "anon insert checkins"
  on public.checkins for insert
  to anon
  with check (true);

drop policy if exists "anon select checkins" on public.checkins;
create policy "anon select checkins"
  on public.checkins for select
  to anon
  using (true);

-- =====================================================================
-- VIEW: ranking público (top campers por pontos)
-- =====================================================================
create or replace view public.ranking as
select
  u.id,
  u.name,
  u.phone_key,
  count(c.id) as total_checkins,
  coalesce(sum(c.points), 0) as total_points,
  max(c.created_at) as last_checkin
from public.users u
left join public.checkins c on c.user_id = u.id
group by u.id, u.name, u.phone_key
order by total_points desc, last_checkin asc;

-- =====================================================================
-- DADOS DE EXEMPLO (descomente pra popular pra teste)
-- =====================================================================
-- insert into public.events (code, name, event_date, active) values
--   ('EVENTO1', 'PCamp Pocket Vix #1', '2026-03-15', true),
--   ('EVENTO2', 'PCamp Pocket Vix #2', '2026-04-19', true),
--   ('VIX2026', 'PCamp Pocket Vix Lançamento', '2026-02-08', true),
--   ('POCKET01', 'PCamp Pocket Vix Beta', '2026-01-20', true);
