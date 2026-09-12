import { supabase } from "../supabase.js";
import { formatTime } from "../lib/format.js";

// Played fixtures with score and Player of the Match, newest first.
export async function listResults(seasonId) {
  let q = supabase
    .from("v_fixture_results")
    .select("*")
    .eq("status", "played")
    .order("match_date", { ascending: false })
    .order("home_away", { ascending: true })
    .order("opponent", { ascending: true })
    .order("kickoff", { ascending: false });
  if (seasonId) q = q.eq("season_id", seasonId);
  const { data, error } = await q;
  if (error) throw error;
  return data.map((r) => ({ ...r, kickoff: formatTime(r.kickoff) }));
}
