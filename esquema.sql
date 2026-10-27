-- SOLUCAR MÁS · Instalar una sola vez en Supabase > SQL Editor.
-- RLS: cada cliente únicamente ve y modifica SUS datos/vehículos.
-- Las compras son de SOLO LECTURA para usuarios; no crear pedidos desde el navegador.

create table if not exists public.customer_profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  company_name text,
  comuna text,
  shipping_address text,
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_vehicles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  nickname text,
  brand text not null,
  model text not null,
  year integer check (year between 1950 and 2100),
  plate text,
  created_at timestamptz not null default now()
);

create table if not exists public.customer_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  order_number text unique,
  status text not null default 'Pendiente',
  total_clp integer not null default 0 check (total_clp >= 0),
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists customer_vehicles_user_idx on public.customer_vehicles(user_id);
create index if not exists customer_orders_user_date_idx on public.customer_orders(user_id, created_at desc);

alter table public.customer_profiles enable row level security;
alter table public.customer_vehicles enable row level security;
alter table public.customer_orders enable row level security;

-- Policies idempotentes (repetir SQL no crea políticas duplicadas).
drop policy if exists "profile_self_read" on public.customer_profiles;
drop policy if exists "profile_self_insert" on public.customer_profiles;
drop policy if exists "profile_self_update" on public.customer_profiles;
drop policy if exists "vehicles_self_read" on public.customer_vehicles;
drop policy if exists "vehicles_self_insert" on public.customer_vehicles;
drop policy if exists "vehicles_self_update" on public.customer_vehicles;
drop policy if exists "vehicles_self_delete" on public.customer_vehicles;
drop policy if exists "orders_self_read" on public.customer_orders;

create policy "profile_self_read" on public.customer_profiles
  for select to authenticated using ((select auth.uid()) = id);
create policy "profile_self_insert" on public.customer_profiles
  for insert to authenticated with check ((select auth.uid()) = id);
create policy "profile_self_update" on public.customer_profiles
  for update to authenticated using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

create policy "vehicles_self_read" on public.customer_vehicles
  for select to authenticated using ((select auth.uid()) = user_id);
create policy "vehicles_self_insert" on public.customer_vehicles
  for insert to authenticated with check ((select auth.uid()) = user_id);
create policy "vehicles_self_update" on public.customer_vehicles
  for update to authenticated using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);
create policy "vehicles_self_delete" on public.customer_vehicles
  for delete to authenticated using ((select auth.uid()) = user_id);

create policy "orders_self_read" on public.customer_orders
  for select to authenticated using ((select auth.uid()) = user_id);

-- Cerrar privilegios a visitantes anónimos y bloquear escritura de compras desde la web.
revoke all on public.customer_profiles from anon;
revoke all on public.customer_vehicles from anon;
revoke all on public.customer_orders from anon;
grant select,insert,update on public.customer_profiles to authenticated;
grant select,insert,update,delete on public.customer_vehicles to authenticated;
revoke insert,update,delete on public.customer_orders from authenticated;
grant select on public.customer_orders to authenticated;

-- Las filas de customer_orders deben ser insertadas únicamente desde un backend
-- con autorización, o manualmente desde el Table Editor con user_id correcto.
-- No alojes nunca la service_role ni una clave secreta en GitHub Pages.
