-- Fixture results joined with that match's Player of the Match, for the Results page.
-- Run after 001-005.

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
  potm.last_name as potm_last_name
from fixtures f
left join lateral (
  select p.id as player_id, p.first_name, p.last_name
  from appearances a
  join players p on p.id = a.player_id
  where a.fixture_id = f.id and a.potm
  limit 1
) potm on true;
