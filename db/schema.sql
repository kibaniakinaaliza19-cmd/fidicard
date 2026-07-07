-- FidiCard Studio -- schema scaffold for Supabase/PostgreSQL.
-- Not wired to a live database in this environment; connect via NEXT_PUBLIC_SUPABASE_URL
-- and NEXT_PUBLIC_SUPABASE_ANON_KEY (see src/lib/supabase.ts) once credentials are available.

create extension if not exists "pgcrypto";

create table if not exists users (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  email text not null unique,
  entreprise text,
  plan text not null default 'free' check (plan in ('free', 'premium')),
  date_creation timestamptz not null default now()
);

create table if not exists templates (
  id uuid primary key default gen_random_uuid(),
  nom text not null,
  categorie text not null,
  type text not null default 'standard' check (type in ('standard', 'custom')),
  preview text,
  configuration_json jsonb not null,
  premium boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users (id) on delete cascade,
  template_id uuid references templates (id) on delete set null,
  design_json jsonb not null,
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists clients (
  id uuid primary key default gen_random_uuid(),
  card_id uuid not null references cards (id) on delete cascade,
  nom text not null,
  email text,
  telephone text,
  points integer not null default 0,
  tampons integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists idx_cards_user_id on cards (user_id);
create index if not exists idx_clients_card_id on clients (card_id);

-- Example template configuration_json payload (mirrors src/data/templates.ts):
-- {
--   "background": "black-gradient",
--   "animation": "light-effect",
--   "colors": { "primary": "#f0653e", "secondary": "#0f0603" },
--   "components": ["logo", "name", "reward", "stamp"]
-- }
