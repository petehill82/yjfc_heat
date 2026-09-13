-- Player display name (nickname/shortened name) - preferred over first+last
-- everywhere a player's name is shown. Mirrors profiles.display_name.
alter table players add column if not exists display_name text;

-- display_name is appended at the end of each view's column list, not
-- inserted alongside first_name/last_name - CREATE OR REPLACE VIEW can only
-- add new trailing columns, not reorder/insert into the existing ones.
create or replace view v_player_season_stats as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  f.season_id,
  count(*) filter (where a.selected) as apps,
  count(*) filter (where a.starting) as starts,
  coalesce(sum(a.minutes_played), 0) as minutes_played,
  coalesce(sum(a.minutes_in_goal), 0) as minutes_in_goal,
  coalesce(sum(a.goals), 0) as goals,
  coalesce(sum(a.assists), 0) as assists,
  count(*) filter (where a.potm) as potm_count,
  round(avg(a.rating), 2) as avg_rating,
  coalesce(sum(a.goals) filter (where f.home_away = 'home'), 0) as goals_home,
  coalesce(sum(a.goals) filter (where f.home_away = 'away'), 0) as goals_away,
  coalesce(sum(a.assists) filter (where f.home_away = 'home'), 0) as assists_home,
  coalesce(sum(a.assists) filter (where f.home_away = 'away'), 0) as assists_away,
  coalesce(sum(a.minutes_played) filter (where f.home_away = 'home'), 0) as minutes_home,
  coalesce(sum(a.minutes_played) filter (where f.home_away = 'away'), 0) as minutes_away,
  p.display_name
from players p
join appearances a on a.player_id = p.id
join fixtures f on f.id = a.fixture_id
group by p.id, p.first_name, p.last_name, f.season_id, p.display_name;

create or replace view v_player_attendance as
select
  p.id as player_id,
  p.first_name,
  p.last_name,
  ts.season_id,
  count(*) filter (where att.present) as sessions_attended,
  count(*) as sessions_possible,
  round(
    100.0 * count(*) filter (where att.present) / greatest(count(*), 1), 1
  ) as attendance_pct,
  p.display_name
from players p
join attendance att on att.player_id = p.id
join training_sessions ts on ts.id = att.session_id
group by p.id, p.first_name, p.last_name, ts.season_id, p.display_name;

create or replace view v_fixture_results as
select
  f.id as fixture_id,
  f.season_id,
  f.match_date,
  f.kickoff,
  f.team_name,
  f.opponent,
  f.home_away,
  f.competition,
  f.status,
  f.our_score,
  f.their_score,
  potm.player_id as potm_player_id,
  potm.first_name as potm_first_name,
  potm.last_name as potm_last_name,
  potm.display_name as potm_display_name
from fixtures f
left join lateral (
  select p.id as player_id, p.first_name, p.last_name, p.display_name
  from appearances a
  join players p on p.id = a.player_id
  where a.fixture_id = f.id and a.potm
  limit 1
) potm on true;
