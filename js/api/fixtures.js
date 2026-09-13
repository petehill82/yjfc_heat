import { supabase } from "../supabase.js";
import { formatTime, coachDisplayName } from "../lib/format.js";

const FIXTURE_COLUMNS = "*, fixture_coaches(profile_id, profiles(full_name, first_name, last_name, display_name))";

// Postgres returns "time" columns as "HH:MM:SS" - trim to "HH:MM". And flatten
// the fixture_coaches join into the shape every view already expects:
// coaches (names, for display) and coach_ids (for the edit form).
function normalizeFixture(row) {
  if (!row) return row;
  const links = row.fixture_coaches || [];
  const coach_ids = links.map((fc) => fc.profile_id);
  const coaches = links.map((fc) => coachDisplayName(fc.profiles)).filter(Boolean).sort((a, b) => a.localeCompare(b));
  const { fixture_coaches, ...rest } = row;
  return { ...rest, kickoff: formatTime(rest.kickoff), coaches, coach_ids };
}

export async function listFixtures({ seasonId = null, status = null } = {}) {
  let q = supabase.from("fixtures")
    .select(FIXTURE_COLUMNS)
    .order("match_date", { ascending: true })
    .order("home_away", { ascending: true })
    .order("opponent", { ascending: true })
    .order("kickoff", { ascending: true });
  if (seasonId) q = q.eq("season_id", seasonId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(normalizeFixture);
}

export async function getFixture(id) {
  const { data, error } = await supabase.from("fixtures").select(FIXTURE_COLUMNS).eq("id", id).single();
  if (error) throw error;
  return normalizeFixture(data);
}

// All fixtures sharing a date ("matchday"), e.g. when the squad is split into
// several of our teams playing different opponents on the same day.
export async function listFixturesOnDate(matchDate) {
  const { data, error } = await supabase
    .from("fixtures")
    .select(FIXTURE_COLUMNS)
    .eq("match_date", matchDate)
    .order("home_away", { ascending: true })
    .order("opponent", { ascending: true })
    .order("kickoff", { ascending: true });
  if (error) throw error;
  return data.map(normalizeFixture);
}

export async function listUpcomingFixtures(limit = 5) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("fixtures")
    .select(FIXTURE_COLUMNS)
    .gte("match_date", today)
    .order("match_date", { ascending: true })
    .order("home_away", { ascending: true })
    .order("opponent", { ascending: true })
    .order("kickoff", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data.map(normalizeFixture);
}

export async function createFixture(fixture) {
  const { data, error } = await supabase.from("fixtures").insert(fixture).select(FIXTURE_COLUMNS).single();
  if (error) throw error;
  return normalizeFixture(data);
}

// Bulk insert - used by the fixtures importer, which may turn each imported
// row into several match rows (one per our-team) in a single call.
export async function createFixturesBulk(fixtures) {
  if (!fixtures.length) return [];
  const { data, error } = await supabase.from("fixtures").insert(fixtures).select(FIXTURE_COLUMNS);
  if (error) throw error;
  return data.map(normalizeFixture);
}

export async function updateFixture(id, patch) {
  const { data, error } = await supabase.from("fixtures").update(patch).eq("id", id).select(FIXTURE_COLUMNS).single();
  if (error) throw error;
  return normalizeFixture(data);
}

export async function deleteFixture(id) {
  const { error } = await supabase.from("fixtures").delete().eq("id", id);
  if (error) throw error;
}

// Replace the full set of coaches assigned to a fixture with `profileIds`.
export async function setFixtureCoaches(fixtureId, profileIds) {
  const { error: delErr } = await supabase.from("fixture_coaches").delete().eq("fixture_id", fixtureId);
  if (delErr) throw delErr;
  if (!profileIds.length) return;
  const rows = profileIds.map((profile_id) => ({ fixture_id: fixtureId, profile_id }));
  const { error: insErr } = await supabase.from("fixture_coaches").insert(rows);
  if (insErr) throw insErr;
}
