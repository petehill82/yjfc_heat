grant usage on schema public to authenticated;
grant select, insert, update, delete on
    profiles, 
    club_settings, 
    seasons, 
    players, 
    fixtures, 
    appearances, 
    availability, 
    training_sessions, 
    attendance
to authenticated;