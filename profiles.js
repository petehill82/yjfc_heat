import { supabase } from "../supabase.js";

export async function listCoaches() {
  const { data, error } = await supabase.from("profiles").select("*").order("full_name");
  if (error) throw error;
  return data;
}

export async function setCoachRole(id, role) {
  const { data, error } = await supabase.from("profiles").update({ role }).eq("id", id).select().single();
  if (error) throw error;
  return data;
}
