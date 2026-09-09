import { supabase } from "../supabase.js";

export async function listPlayers({ activeOnly = true } = {}) {
  let q = supabase.from("players").select("*").order("squad_number", { ascending: true, nullsFirst: false });
  if (activeOnly) q = q.eq("active", true);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function getPlayer(id) {
  const { data, error } = await supabase.from("players").select("*").eq("id", id).single();
  if (error) throw error;
  return data;
}

export async function createPlayer(player) {
  const { data, error } = await supabase.from("players").insert(player).select().single();
  if (error) throw error;
  return data;
}

export async function updatePlayer(id, patch) {
  const { data, error } = await supabase.from("players").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function setPlayerActive(id, active) {
  return updatePlayer(id, { active });
}

export async function deletePlayer(id) {
  const { error } = await supabase.from("players").delete().eq("id", id);
  if (error) throw error;
}

export async function getPlayerSeasonStats(playerId, seasonId) {
  const { data, error } = await supabase
    .from("v_player_season_stats")
    .select("*")
    .eq("player_id", playerId)
    .eq("season_id", seasonId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function getPlayerAppearances(playerId) {
  const { data, error } = await supabase
    .from("appearances")
    .select("*, fixtures(match_date, opponent, home_away, our_score, their_score, status, team_name)")
    .eq("player_id", playerId)
    .order("fixture_id", { ascending: false });
  if (error) throw error;
  return data;
}
