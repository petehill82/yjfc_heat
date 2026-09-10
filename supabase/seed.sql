-- Optional demo data for local testing. Safe to skip in production.
-- Run after 001, 002, 003.

insert into seasons (name, squad_name, start_date, end_date, is_current)
values ('2026/27', 'Lions U11s', '2026-09-01', '2027-05-31', true)
returning id;
-- Copy the returned id and use it below in place of (select id from seasons where is_current)

with s as (select id from seasons where is_current limit 1)
insert into players (first_name, last_name, squad_number, preferred_positions, year_of_birth, active)
select first_name, last_name, squad_number, positions, 2016, true
from (values
  ('Oliver','Smith',1, array['GK']),
  ('Jack','Jones',2, array['RB']),
  ('Harry','Taylor',3, array['LB']),
  ('George','Williams',4, array['CB']),
  ('Noah','Brown',5, array['CB']),
  ('Charlie','Davies',6, array['CM']),
  ('Jacob','Evans',7, array['RW']),
  ('Thomas','Wilson',8, array['CM']),
  ('Oscar','Thomas',9, array['ST']),
  ('James','Roberts',10, array['CAM']),
  ('Leo','Johnson',11, array['LW']),
  ('Alfie','Walker',12, array['GK']),
  ('Freddie','White',13, array['CB']),
  ('Archie','Harris',14, array['RB']),
  ('Henry','Martin',15, array['LB']),
  ('Joshua','Thompson',16, array['CM']),
  ('Ethan','Clark',17, array['ST']),
  ('Mason','Lewis',18, array['CM']),
  ('Logan','Hall',19, array['RW']),
  ('Isaac','Young',20, array['LW']),
  ('Muhammad','King',21, array['CB']),
  ('Daniel','Wright',22, array['CAM']),
  ('Max','Green',23, array['ST']),
  ('Finley','Baker',24, array['CB']),
  ('Reggie','Adams',25, array['RB']),
  ('Theo','Nelson',26, array['LB']),
  ('Arthur','Carter',27, array['CM']),
  ('Toby','Mitchell',28, array['GK']),
  ('Kai','Perry',29, array['ST']),
  ('Ryan','Bell',30, array['CM'])
) as v(first_name, last_name, squad_number, positions);

with s as (select id from seasons where is_current limit 1)
insert into fixtures (season_id, match_date, kickoff, team_name, opponent, home_away, venue, format, status, our_score, their_score)
select s.id, d.match_date, d.kickoff, d.team_name, d.opponent, d.home_away, d.venue, '9v9', d.status, d.our_score, d.their_score
from s, (values
  (current_date + 7, '10:00'::time, 'Orange', 'Riverside FC', 'home'::home_away, 'Home Ground', 'scheduled'::fixture_status, null::int, null::int),
  (current_date + 7, '10:00'::time, 'Black',  'Riverside FC B', 'home'::home_away, 'Home Ground', 'scheduled'::fixture_status, null::int, null::int),
  (current_date - 7, '10:00'::time, null, 'Meadow Rangers', 'away'::home_away, 'Meadow Park', 'played'::fixture_status, 4, 2)
) as d(match_date, kickoff, team_name, opponent, home_away, venue, status, our_score, their_score);
