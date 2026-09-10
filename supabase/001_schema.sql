-- Youth Football Squad Manager: core schema
-- Run this first in the Supabase SQL editor.

create extension if not exists pgcrypto;

-- ---------- enums ----------
do $$ begin
  create type role as enum ('admin', 'coach');
exception when duplicate_object then null; end $$;

do $$ begin
  create type home_away as enum ('home', 'away');
exception when duplicate_object then null; end $$;

do $$ begin
  create type fixture_status as enum ('scheduled', 'played', 'cancelled', 'postponed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type avail_status as enum ('available', 'unavailable', 'unknown');
exception when duplicate_object then null; end $$;

-- ---------- profiles (one row per auth user) ----------
create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  full_name text,
  role role not null default 'coach',
  created_at timestamptz not null default now()
);

-- ---------- club-wide settings (single row) ----------
create table if not exists club_settings (
  id int primary key default 1 check (id = 1),
  club_name text not null default 'My Club',
  badge_path text not null default 'assets/badge.svg',
  primary_colour text not null default '#ea580c'
);
insert into club_settings (id) values (1) on conflict (id) do nothing;

-- ---------- seasons ----------
create table if not exists seasons (
  id uuid primary key default gen_random_uuid(),
  name text not null,                 -- e.g. "2026/27"
  squad_name text not null,           -- e.g. "Lions U10s" - changes each year
  start_date date,
  end_date date,
  is_current boolean not null default false,
  created_at timestamptz not null default now()
);
create unique index if not exists one_current_season
  on seasons ((is_current)) where is_current;

-- ---------- players ----------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  first_name text not null,
  last_name text not null,
  squad_number int,
  preferred_positions text[] not null default '{}',
  year_of_birth int,
  notes text,
  active boolean not null default true,
  created_at timestamptz not null default now()
);
create index if not exists players_active_idx on players (active);

-- ---------- fixtures ----------
create table if not exists fixtures (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons on delete set null,
  match_date date not null,
  kickoff time,
  team_name text,                     -- label to tell OUR teams apart on a split matchday
  opponent text not null,
  home_away home_away not null default 'home',
  venue text,
  competition text,
  format text,                        -- e.g. "7v7", "9v9", "11v11"
  status fixture_status not null default 'scheduled',
  our_score int,
  their_score int,
  notes text,
  created_at timestamptz not null default now()
);
create index if not exists fixtures_match_date_idx on fixtures (match_date);
create index if not exists fixtures_season_idx on fixtures (season_id);

-- ---------- appearances (selection + stats, one row per player per fixture) ----------
create table if not exists appearances (
  fixture_id uuid not null references fixtures on delete cascade,
  player_id uuid not null references players on delete cascade,
  selected boolean not null default true,
  starting boolean not null default false,
  shirt_number int,
  position text,
  minutes_played int not null default 0 check (minutes_played >= 0 and minutes_played <= 200),
  minutes_in_goal int not null default 0 check (minutes_in_goal >= 0),
  goals int not null default 0 check (goals >= 0),
  assists int not null default 0 check (assists >= 0),
  rating numeric(3,1) check (rating is null or (rating >= 0 and rating <= 10)),
  potm boolean not null default false,
  primary key (fixture_id, player_id),
  constraint minutes_in_goal_le_played check (minutes_in_goal <= minutes_played)
);
create index if not exists appearances_player_idx on appearances (player_id);

-- ---------- availability (per player per date) ----------
create table if not exists availability (
  player_id uuid not null references players on delete cascade,
  on_date date not null,
  status avail_status not null default 'unknown',
  note text,
  primary key (player_id, on_date)
);
create index if not exists availability_date_idx on availability (on_date);

-- ---------- training attendance ----------
create table if not exists training_sessions (
  id uuid primary key default gen_random_uuid(),
  season_id uuid references seasons on delete set null,
  session_date date not null,
  notes text
);
create index if not exists training_sessions_date_idx on training_sessions (session_date);

create table if not exists attendance (
  session_id uuid not null references training_sessions on delete cascade,
  player_id uuid not null references players on delete cascade,
  present boolean not null default true,
  primary key (session_id, player_id)
);
