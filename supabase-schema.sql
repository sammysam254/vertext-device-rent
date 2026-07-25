-- ============================================================
-- Vertext Devices — Supabase Database Schema
-- Run this in your Supabase SQL Editor
-- ============================================================

-- 1. PROFILES (extends auth.users)
create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text,
  full_name   text,
  role        text not null default 'customer' check (role in ('customer', 'admin')),
  created_at  timestamptz not null default now()
);

-- Auto-create profile on sign up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    case when new.email = 'sammyseth260@gmail.com' then 'admin' else 'customer' end
  )
  on conflict (id) do nothing;

  -- Auto-create wallet
  insert into public.wallets (user_id, balance_cents, currency)
  values (new.id, 0, 'usd')
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 2. WALLETS
create table if not exists public.wallets (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid unique not null references public.profiles(id) on delete cascade,
  balance_cents   integer not null default 0,
  currency        text not null default 'usd',
  updated_at      timestamptz not null default now()
);

-- 3. WALLET TRANSACTIONS
create table if not exists public.wallet_transactions (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  type                text not null check (type in ('deposit', 'purchase', 'renewal')),
  amount_cents        integer not null,
  balance_after_cents integer not null default 0,
  reference           text,
  provider            text,
  status              text not null default 'pending' check (status in ('pending', 'completed', 'failed')),
  created_at          timestamptz not null default now()
);

-- 4. DEVICES
create table if not exists public.devices (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  phone_id            text not null,
  order_id            text,
  model               text not null,
  platform            text not null,
  status              text not null default 'active' check (status in ('active', 'expired', 'cancelled')),
  stream_url          text,
  stream_token        char(6) unique,
  pin                 text,
  one_time_fee_cents  integer not null default 0,
  monthly_fee_cents   integer not null default 0,
  purchased_at        timestamptz not null default now(),
  expires_at          timestamptz,
  next_renewal_at     timestamptz
);

-- 5. DEVICE PRICING (admin-set)
create table if not exists public.device_pricing (
  id                  uuid primary key default gen_random_uuid(),
  phone_id            text,
  model               text,
  one_time_fee_cents  integer not null,
  monthly_fee_cents   integer not null,
  is_active           boolean not null default true,
  created_at          timestamptz not null default now()
);

-- 6. ADMIN SETTINGS (key-value store)
create table if not exists public.admin_settings (
  key         text primary key,
  value       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Default global pricing
insert into public.admin_settings (key, value)
values ('default_pricing', '{"one_time_fee_cents": 999, "monthly_fee_cents": 2999}')
on conflict (key) do nothing;

-- Default KES/USD rate (1 USD = 130 KES)
insert into public.admin_settings (key, value)
values ('kes_usd_rate', '{"rate": 130}')
on conflict (key) do nothing;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.wallet_transactions enable row level security;
alter table public.devices enable row level security;
alter table public.device_pricing enable row level security;
alter table public.admin_settings enable row level security;

-- Helper: is current user admin?
create or replace function public.is_admin()
returns boolean language sql security definer as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

-- Profiles: users see own, admin sees all
create policy "profiles_self" on public.profiles
  for all using (id = auth.uid() or public.is_admin());

-- Wallets: users see own, admin sees all
create policy "wallets_self" on public.wallets
  for all using (user_id = auth.uid() or public.is_admin());

-- Wallet transactions: users see own, admin sees all
create policy "wallet_tx_self" on public.wallet_transactions
  for all using (user_id = auth.uid() or public.is_admin());

-- Devices: users see own, admin sees all
create policy "devices_self" on public.devices
  for select using (user_id = auth.uid() or public.is_admin());
create policy "devices_insert" on public.devices
  for insert with check (user_id = auth.uid() or public.is_admin());
create policy "devices_update" on public.devices
  for update using (user_id = auth.uid() or public.is_admin());

-- Device pricing: anyone can read (for store page), admin can write
create policy "pricing_read" on public.device_pricing
  for select using (true);
create policy "pricing_write" on public.device_pricing
  for all using (public.is_admin());

-- Admin settings: anyone can read, admin can write
create policy "settings_read" on public.admin_settings
  for select using (true);
create policy "settings_write" on public.admin_settings
  for all using (public.is_admin());

-- ============================================================
-- INDEXES
-- ============================================================
create index if not exists idx_devices_user_id on public.devices(user_id);
create index if not exists idx_devices_stream_token on public.devices(stream_token);
create index if not exists idx_devices_status on public.devices(status);
create index if not exists idx_wallet_tx_user_id on public.wallet_transactions(user_id);
create index if not exists idx_wallet_tx_reference on public.wallet_transactions(reference);
create index if not exists idx_wallets_user_id on public.wallets(user_id);

-- ============================================================
-- SERVICE ROLE: bypass RLS for Netlify Functions
-- (Netlify Functions use SUPABASE_SERVICE_ROLE_KEY — bypasses RLS automatically)
-- ============================================================
