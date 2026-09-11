-- Views don't inherit the table grants in 004_grants.sql - they need their
-- own explicit grant, or "authenticated" gets "permission denied for view".
-- RLS on the underlying tables still applies (these views run with the
-- querying user's own privileges, not the view owner's).
grant select on
    v_player_season_stats,
    v_team_results,
    v_player_attendance,
    v_fixture_results
to authenticated;
