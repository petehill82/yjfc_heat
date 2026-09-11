import { supabase } from "../supabase.js";
import { formatTime } from "../lib/format.js";

// Postgres returns "time" columns as "HH:MM:SS" - trim to "HH:MM" everywhere
// a fixture is read, so no view has to remember to do it.
function trimKickoff(row) {
  return row ? { ...row, kickoff: formatTime(row.kickoff) } : row;
}

export async function listFixtures({ seasonId = null, status = null } = {}) {
  let q = supabase.from("fixtures")
    .select("*")
    .order("match_date", { ascending: true })
    .order("kickoff", { ascending: true });
  if (seasonId) q = q.eq("season_id", seasonId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data.map(trimKickoff);
}

export async function getFixture(id) {
  const { data, error } = await supabase.from("fixtures").select("*").eq("id", id).single();
  if (error) throw error;
  return trimKickoff(data);
}

// All fixtures sharing a date ("matchday"), e.g. when the squad is split into
// several of our teams playing different opponents on the same day.
export async function listFixturesOnDate(matchDate) {
  const { data, error } = await supabase
    .from("fixtures")
    .select("*")
    .eq("match_date", matchDate)
    .order("kickoff", { ascending: true });
  if (error) throw error;
  return data.map(trimKickoff);
}

export async function listUpcomingFixtures(limit = 5) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("fixtures")
    .select("*")
    .gte("match_date", today)
    .order("match_date", { ascending: true })
    .order("kickoff", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data.map(trimKickoff);
}

export async function createFixture(fixture) {
  const { data, error } = await supabase.from("fixtures").insert(fixture).select().single();
  if (error) throw error;
  return trimKickoff(data);
}

// Bulk insert - used by the fixtures importer, which may turn each imported
// row into several match rows (one per our-team) in a single call.
export async function createFixturesBulk(fixtures) {
  if (!fixtures.length) return [];
  const { data, error } = await supabase.from("fixtures").insert(fixtures).select();
  if (error) throw error;
  return data.map(trimKickoff);
}

export async function updateFixture(id, patch) {
  const { data, error } = await supabase.from("fixtures").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return trimKickoff(data);
}

export async function deleteFixture(id) {
  const { error } = await supabase.from("fixtures").delete().eq("id", id);
  if (error) throw error;
}
