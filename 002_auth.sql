-- Auth: profile bootstrap + role helper + Row Level Security policies.
-- Run this after 001_schema.sql.

-- ---------- create a profile row whenever a new auth user signs in ----------
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), 'coach')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------- is_admin() helper, usable inside RLS policies ----------
create or replace function is_admin()
returns boolean
language sql
security definer set search_path = public
stable
as $$
  select exists (
    select 1 from profiles where id = auth.uid() and role = 'admin'
  );
$$;

-- ---------- enable RLS everywhere ----------
alter table profiles enable row level security;
alter table club_settings enable row level security;
alter table seasons enable row level security;
alter table players enable row level security;
alter table fixtures enable row level security;
alter table appearances enable row level security;
alter table availability enable row level security;
alter table training_sessions enable row level security;
alter table attendance enable row level security;

-- ---------- profiles ----------
drop policy if exists profiles_select_own_or_admin on profiles;
create policy profiles_select_own_or_admin on profiles
  for select using (auth.uid() = id or is_admin());

drop policy if exists profiles_update_admin on profiles;
create policy profiles_update_admin on profiles
  for update using (is_admin());

-- ---------- club_settings: any signed-in coach can read, admin can edit ----------
drop policy if exists club_settings_select on club_settings;
create policy club_settings_select on club_settings
  for select using (auth.uid() is not null);

drop policy if exists club_settings_update_admin on club_settings;
create policy club_settings_update_admin on club_settings
  for update using (is_admin());

-- ---------- seasons: coaches read, admin writes ----------
drop policy if exists seasons_select on seasons;
create policy seasons_select on seasons
  for select using (auth.uid() is not null);

drop policy if exists seasons_admin_write on seasons;
create policy seasons_admin_write on seasons
  for all using (is_admin()) with check (is_admin());

-- ---------- players: coaches read, only admin adds/edits/removes ----------
drop policy if exists players_select on players;
create policy players_select on players
  for select using (auth.uid() is not null);

drop policy if exists players_admin_write on players;
create policy players_admin_write on players
  for insert with check (is_admin());
drop policy if exists players_admin_update on players;
create policy players_admin_update on players
  for update using (is_admin());
drop policy if exists players_admin_delete on players;
create policy players_admin_delete on players
  for delete using (is_admin());

-- ---------- fixtures: any coach reads/creates/edits, only admin deletes ----------
drop policy if exists fixtures_select on fixtures;
create policy fixtures_select on fixtures
  for select using (auth.uid() is not null);
drop policy if exists fixtures_coach_insert on fixtures;
create policy fixtures_coach_insert on fixtures
  for insert with check (auth.uid() is not null);
drop policy if exists fixtures_coach_update on fixtures;
create policy fixtures_coach_update on fixtures
  for update using (auth.uid() is not null);
drop policy if exists fixtures_admin_delete on fixtures;
create policy fixtures_admin_delete on fixtures
  for delete using (is_admin());

-- ---------- appearances / availability / training / attendance: any coach reads & writes ----------
drop policy if exists appearances_all on appearances;
create policy appearances_all on appearances
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists availability_all on availability;
create policy availability_all on availability
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists training_sessions_all on training_sessions;
create policy training_sessions_all on training_sessions
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

drop policy if exists attendance_all on attendance;
create policy attendance_all on attendance
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

-- ---------- one-off: after you first log in, promote yourself to admin ----------
-- update profiles set role = 'admin' where id = auth.uid();
