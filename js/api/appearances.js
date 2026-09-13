import { supabase } from "../supabase.js";

// All appearance rows for one fixture, joined with player name/number for display.
export async function listAppearancesForFixture(fixtureId) {
  const { data, error } = await supabase
    .from("appearances")
    .select("*, players(first_name, last_name, display_name, squad_number, preferred_positions)")
    .eq("fixture_id", fixtureId);
  if (error) throw error;
  return data;
}

// Which fixture ids (besides `excludeFixtureId`) a set of players is already
// selected for on the same match_date - used to warn about double-booking
// a player across two of our teams on a split matchday.
export async function listSelectionsOnDate(matchDate, excludeFixtureId) {
  const { data, error } = await supabase
    .from("appearances")
    .select("player_id, fixture_id, fixtures!inner(match_date)")
    .eq("fixtures.match_date", matchDate)
    .eq("selected", true)
    .neq("fixture_id", excludeFixtureId);
  if (error) throw error;
  return data;
}

// Upsert one appearance row (selection or stats).
export async function upsertAppearance(row) {
  const { data, error } = await supabase
    .from("appearances")
    .upsert(row, { onConflict: "fixture_id,player_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Upsert several rows at once (e.g. saving a whole team sheet or stats grid).
export async function upsertAppearances(rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from("appearances")
    .upsert(rows, { onConflict: "fixture_id,player_id" })
    .select();
  if (error) throw error;
  return data;
}

export async function removeAppearance(fixtureId, playerId) {
  const { error } = await supabase
    .from("appearances")
    .delete()
    .eq("fixture_id", fixtureId)
    .eq("player_id", playerId);
  if (error) throw error;
}
