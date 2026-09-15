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

create table if not exists commerces (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references users (id) on delete cascade,
  nom text not null,
  plan text not null default 'starter' check (plan in ('starter', 'pro', 'business')),
  -- Programme de fidélité (couche Fonctionnalités — src/lib/loyalty.ts ;
  -- alimenté à la main ou par l'import de carte)
  mode_fidelite text not null default 'stamps' check (mode_fidelite in ('stamps', 'points')),
  objectif_tampons integer not null default 10,
  -- {"type":"passage"} | {"type":"montant_minimum","seuil":10} | {"type":"montant_palier","tranche":15}
  regle_attribution jsonb not null default '{"type":"passage"}'::jsonb,
  taux_conversion integer not null default 10, -- mode points : 1 € = N points
  -- ex: [{"position": 3, "label": "-5€", "description": "5 € de réduction", "type": "montant"}]
  paliers jsonb not null default '[]'::jsonb,
  programme_publie boolean not null default false,
  consigne text,
  reseau_social text,
  site_web text,
  created_at timestamptz not null default now()
);

-- One row per notification actually sent, used to enforce the plan's
-- monthly quota (PLAN_LIMITS.notifsParMois in src/lib/plans.ts).
create table if not exists notifications (
  id uuid primary key default gen_random_uuid(),
  commerce_id uuid not null references commerces (id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_notifications_commerce_id on notifications (commerce_id);

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
  -- identifiant UNIQUE du QR de la carte client — c'est lui que le commerçant
  -- scanne ; jamais partagé entre deux clients
  code_client text unique,
  -- positions des paliers déjà débloqués dans le cycle en cours
  paliers_atteints jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

-- Un enregistrement par scan : la trace factuelle de chaque passage.
-- (Toutes les écritures scan → clients + passages doivent être transactionnelles.)
create table if not exists passages (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references clients (id) on delete cascade,
  commerce_id uuid references commerces (id) on delete cascade,
  montant numeric,
  tampons_ajoutes integer not null default 0,
  points_ajoutes integer not null default 0,
  -- palier(s) débloqué(s) par ce scan, ex: [{"position":6,"label":"-15%"}]
  paliers_declenches jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists idx_cards_user_id on cards (user_id);
create index if not exists idx_clients_card_id on clients (card_id);
create index if not exists idx_clients_code on clients (code_client);
create index if not exists idx_passages_client_id on passages (client_id);

-- Example template configuration_json payload (mirrors src/data/templates.ts):
-- {
--   "background": "black-gradient",
--   "animation": "light-effect",
--   "colors": { "primary": "#f0653e", "secondary": "#0f0603" },
--   "components": ["logo", "name", "reward", "stamp"]
-- }
