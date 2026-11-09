-- =====================================================================
-- PCamp Points Vix — Pontos manuais (aba "Adicionar pontos" do admin)
-- Rode esse arquivo no SQL Editor do Supabase.
-- =====================================================================

-- Cada lançamento manual de pontos, com a justificativa exibida no ranking.
create table if not exists public.bonus_points (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  points int not null check (points > 0),
  reason text not null check (length(trim(reason)) > 0),
  created_at timestamptz not null default now()
);

create index if not exists idx_bonus_points_user on public.bonus_points (user_id);

alter table public.bonus_points enable row level security;

drop policy if exists "anon insert bonus_points" on public.bonus_points;
create policy "anon insert bonus_points"
  on public.bonus_points for insert
  to anon
  with check (true);

drop policy if exists "anon select bonus_points" on public.bonus_points;
create policy "anon select bonus_points"
  on public.bonus_points for select
  to anon
  using (true);

-- Necessário pro "Zerar pontos" do admin remover também os pontos manuais
drop policy if exists "anon delete bonus_points" on public.bonus_points;
create policy "anon delete bonus_points"
  on public.bonus_points for delete
  to anon
  using (true);
