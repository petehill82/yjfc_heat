import { supabase } from "../supabase.js";

export async function listAvailabilityForDate(onDate) {
  const { data, error } = await supabase.from("availability").select("*").eq("on_date", onDate);
  if (error) throw error;
  return data;
}

export async function setAvailability(playerId, onDate, status, note = null) {
  const { data, error } = await supabase
    .from("availability")
    .upsert({ player_id: playerId, on_date: onDate, status, note }, { onConflict: "player_id,on_date" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Bulk upsert - used by "Mark all available" so a whole squad's availability
// for one date is set in a single call instead of one request per player.
export async function setAvailabilityBulk(rows) {
  if (!rows.length) return [];
  const { data, error } = await supabase
    .from("availability")
    .upsert(rows, { onConflict: "player_id,on_date" })
    .select();
  if (error) throw error;
  return data;
}

export async function listUpcomingAvailability(fromDate, toDate) {
  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .gte("on_date", fromDate)
    .lte("on_date", toDate);
  if (error) throw error;
  return data;
}
