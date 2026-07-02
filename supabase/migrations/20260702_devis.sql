-- Table des devis pro (générés par les clients B2B depuis leur panier)
-- À exécuter dans Supabase Dashboard → SQL Editor

create table if not exists public.devis (
  id            uuid          default gen_random_uuid() primary key,
  devis_number  text          not null unique,
  user_id       uuid          references auth.users(id) on delete set null,
  email         text          not null,
  customer_name text,
  company       text,
  lines         jsonb         not null default '[]',
  total_ht      numeric(10,2) not null,
  total_ttc     numeric(10,2) not null,
  frais_ht      numeric(10,2) not null default 0,
  status        text          not null default 'draft',  -- draft | converted | expired
  created_at    timestamptz   not null default now(),
  valid_until   timestamptz   not null default (now() + interval '30 days')
);

create index if not exists devis_user_id_idx on public.devis (user_id);
create index if not exists devis_created_at_idx on public.devis (created_at desc);

-- RLS : chaque client voit et crée uniquement ses propres devis
alter table public.devis enable row level security;

create policy "Users voient leurs devis"
  on public.devis for select
  using (auth.uid() = user_id);

create policy "Users créent leurs devis"
  on public.devis for insert
  with check (auth.uid() = user_id);
