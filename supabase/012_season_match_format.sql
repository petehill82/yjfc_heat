-- Match format (minutes per game, players on the pitch) is now a per-season
-- setting, editable from Admin, instead of a hardcoded constant - formats
-- change across age groups/seasons. Defaults match the current season.
alter table seasons
  add column if not exists game_minutes int not null default 50,
  add column if not exists players_on_pitch int not null default 7;
