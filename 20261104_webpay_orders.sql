-- Ejecutar en Supabase > SQL Editor ANTES de desplegar la función.
-- La tabla contiene datos privados del comprador y NO permite acceso anónimo directo.
create table if not exists public.webpay_orders (
  id uuid primary key default gen_random_uuid(),
  buy_order text not null unique,
  session_id text not null,
  token_ws text unique,
  amount_clp bigint not null check (amount_clp > 0),
  items jsonb not null,
  customer jsonb not null,
  environment text not null check (environment in ('integration', 'production')),
  status text not null default 'creating'
    check (status in ('creating','pending','processing','authorized','rejected','aborted','failed','review')),
  tbk_response jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  finished_at timestamptz
);
create index if not exists webpay_orders_created_at_idx on public.webpay_orders (created_at desc);
alter table public.webpay_orders enable row level security;
-- No se crean políticas para anon/authenticated: solo la función con service_role accede.
revoke all on public.webpay_orders from anon, authenticated;
