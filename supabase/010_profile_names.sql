-- Proper name fields for profiles. full_name is auto-set from Supabase Auth
-- metadata (usually just the invited email address, since the dashboard
-- invite flow doesn't ask for a name) - these are what an admin fills in
-- afterwards, and what the app actually displays.
alter table profiles
  add column if not exists first_name text,
  add column if not exists last_name text,
  add column if not exists display_name text;
