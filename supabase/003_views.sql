-- Reporting views used by the dashboard. Run after 001 and 002.

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
  coalesce(sum(a.minutes_played) filter (where f.home_away = 'away'), 0) as minutes_away
from players p
join appearances a on a.player_id = p.id
join fixtures f on f.id = a.fixture_id
group by p.id, p.first_name, p.last_name, f.season_id;

create or replace view v_team_results as
select
  f.season_id,
  coalesce(f.team_name, '') as team_name,
  count(*) as played,
  count(*) filter (where f.our_score > f.their_score) as wins,
  count(*) filter (where f.our_score = f.their_score) as draws,
  count(*) filter (where f.our_score < f.their_score) as losses,
  coalesce(sum(f.our_score), 0) as goals_for,
  coalesce(sum(f.their_score), 0) as goals_against,
  count(*) filter (where f.home_away = 'home') as played_home,
  count(*) filter (where f.home_away = 'home' and f.our_score > f.their_score) as wins_home,
  count(*) filter (where f.home_away = 'home' and f.our_score = f.their_score) as draws_home,
  count(*) filter (where f.home_away = 'home' and f.our_score < f.their_score) as losses_home,
  coalesce(sum(f.our_score) filter (where f.home_away = 'home'), 0) as goals_for_home,
  coalesce(sum(f.their_score) filter (where f.home_away = 'home'), 0) as goals_against_home,
  count(*) filter (where f.home_away = 'away') as played_away,
  count(*) filter (where f.home_away = 'away' and f.our_score > f.their_score) as wins_away,
  count(*) filter (where f.home_away = 'away' and f.our_score = f.their_score) as draws_away,
  count(*) filter (where f.home_away = 'away' and f.our_score < f.their_score) as losses_away,
  coalesce(sum(f.our_score) filter (where f.home_away = 'away'), 0) as goals_for_away,
  coalesce(sum(f.their_score) filter (where f.home_away = 'away'), 0) as goals_against_away
from fixtures f
where f.status = 'played' and f.our_score is not null and f.their_score is not null
group by f.season_id, f.team_name;

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
  ) as attendance_pct
from players p
join attendance att on att.player_id = p.id
join training_sessions ts on ts.id = att.session_id
group by p.id, p.first_name, p.last_name, ts.season_id;
