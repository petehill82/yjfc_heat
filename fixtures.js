import { supabase } from "../supabase.js";

export async function listFixtures({ seasonId = null, status = null } = {}) {
  let q = supabase.from("fixtures").select("*").order("match_date", { ascending: true });
  if (seasonId) q = q.eq("season_id", seasonId);
  if (status) q = q.eq("status", status);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getFixture(id) {
  const { data, error } = await supabase.from("fixtures").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
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
  return data;
}

export async function listUpcomingFixtures(limit = 5) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("fixtures")
    .select("*")
    .gte("match_date", today)
    .order("match_date", { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data;
}

export async function createFixture(fixture) {
  const { data, error } = await supabase.from("fixtures").insert(fixture).select().single();
  if (error) throw error;
  return data;
}

export async function updateFixture(id, patch) {
  const { data, error } = await supabase.from("fixtures").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteFixture(id) {
  const { error } = await supabase.from("fixtures").delete().eq("id", id);
  if (error) throw error;
}
