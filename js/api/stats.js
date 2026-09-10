import { supabase } from "../supabase.js";

export async function playerSeasonStats(seasonId) {
  const { data, error } = await supabase.from("v_player_season_stats").select("*").eq("season_id", seasonId);
  if (error) throw error;
  return data;
}

export async function teamResults(seasonId) {
  const { data, error } = await supabase.from("v_team_results").select("*").eq("season_id", seasonId);
  if (error) throw error;
  return data;
}
