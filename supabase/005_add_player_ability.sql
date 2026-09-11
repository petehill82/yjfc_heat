-- Adds a 1-10 ability rating per player, used to order squads on the
-- matchday team-picker screen (highest ability first, then alphabetically).
-- Run this after 001-004 against an existing database.

alter table players add column if not exists ability smallint check (ability between 1 and 10);
