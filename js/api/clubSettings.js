import { supabase } from "../supabase.js";

export async function getClubSettings() {
  const { data, error } = await supabase.from("club_settings").select("*").eq("id", 1).single();
  if (error) throw error;
  return data;
}

export async function updateClubSettings(patch) {
  const { data, error } = await supabase.from("club_settings").update(patch).eq("id", 1).select().single();
  if (error) throw error;
  return data;
}
