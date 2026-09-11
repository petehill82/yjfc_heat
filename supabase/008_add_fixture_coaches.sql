-- Coaches assigned to a fixture. Free-text names, not tied to a profile/
-- account - most coaches taking a match won't have (or need) an app login.
alter table fixtures add column if not exists coaches text[] not null default '{}';
