import { supabase } from "../supabase.js";

export async function listSeasons() {
  const { data, error } = await supabase.from("seasons").select("*").order("start_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createSeason(season) {
  const { data, error } = await supabase.from("seasons").insert(season).select().single();
  if (error) throw error;
  return data;
}

export async function updateSeason(id, patch) {
  const { data, error } = await supabase.from("seasons").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

// Only one season may be current; clear the others first.
export async function setCurrentSeason(id) {
  const { error: e1 } = await supabase.from("seasons").update({ is_current: false }).neq("id", id);
  if (e1) throw e1;
  const { data, error } = await supabase.from("seasons").update({ is_current: true }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteSeason(id) {
  const { error } = await supabase.from("seasons").delete().eq("id", id);
  if (error) throw error;
}
