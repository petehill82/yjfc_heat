import { supabase } from "../supabase.js";
import { coachDisplayName } from "../lib/format.js";

export async function listCoaches() {
  const { data, error } = await supabase.from("profiles").select("*");
  if (error) throw error;
  return data.sort((a, b) => coachDisplayName(a).localeCompare(coachDisplayName(b)));
}

export async function setCoachRole(id, role) {
  const { data, error } = await supabase.from("profiles").update({ role }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateProfile(id, patch) {
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
