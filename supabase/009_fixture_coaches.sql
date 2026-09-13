-- Link fixture coaches to registered profiles (people with an app login),
-- replacing the free-text fixtures.coaches column. A fixture can have
-- several coaches; a coach can be on several fixtures.

create table if not exists fixture_coaches (
  fixture_id uuid not null references fixtures on delete cascade,
  profile_id uuid not null references profiles on delete cascade,
  primary key (fixture_id, profile_id)
);
create index if not exists fixture_coaches_profile_idx on fixture_coaches (profile_id);

alter table fixture_coaches enable row level security;
drop policy if exists fixture_coaches_all on fixture_coaches;
create policy fixture_coaches_all on fixture_coaches
  for all using (auth.uid() is not null) with check (auth.uid() is not null);

grant select, insert, update, delete on fixture_coaches to authenticated;

-- This column's data is dropped - it was only ever free text names, not
-- linked to anyone, so there's nothing meaningful to migrate across.
alter table fixtures drop column if exists coaches;

-- Any signed-in coach needs to see the list of registered coaches to assign
-- them to a fixture (previously only admins could read other people's
-- profile rows). Names/roles aren't sensitive within a small club's own app.
drop policy if exists profiles_select_own_or_admin on profiles;
drop policy if exists profiles_select_all_signed_in on profiles;
create policy profiles_select_all_signed_in on profiles
  for select using (auth.uid() is not null);
