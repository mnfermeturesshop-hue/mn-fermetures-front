-- Table des commandes
-- À exécuter dans Supabase Dashboard → SQL Editor
-- Si une table orders existait déjà (ancienne tentative), on la recrée proprement
drop table if exists public.orders cascade;

create table public.orders (
  id               uuid        default gen_random_uuid() primary key,
  order_number     text        not null unique,
  email            text        not null,
  customer_name    text        not null,
  is_guest         boolean     not null default true,
  user_id          uuid        references auth.users(id) on delete set null,
  status           text        not null default 'pending',
  payment_method   text        not null,
  shipping_method  text        not null,
  lines            jsonb       not null default '[]',
  total_ht         numeric(10,2) not null,
  total_ttc        numeric(10,2) not null,
  frais_ht         numeric(10,2) not null default 0,
  shipping_address jsonb       not null,
  billing_address  jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- Index pour les lookups courants
create index orders_email_idx         on public.orders (email);
create index orders_user_id_idx       on public.orders (user_id);
create index orders_order_number_idx  on public.orders (order_number);
create index orders_created_at_idx    on public.orders (created_at desc);

-- Mise à jour automatique de updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

-- RLS : les utilisateurs voient uniquement leurs propres commandes
alter table public.orders enable row level security;

create policy "Clients voient leurs commandes"
  on public.orders for select
  using (auth.uid() = user_id);

-- Les écritures passent exclusivement par le service_role (API admin)
-- Aucune policy INSERT/UPDATE/DELETE pour les anons ou auth users
