import { supabase } from "../supabase.js";

export async function listTrainingSessions(seasonId = null) {
  let q = supabase.from("training_sessions").select("*").order("session_date", { ascending: false });
  if (seasonId) q = q.eq("season_id", seasonId);
  const { data, error } = await q;
  if (error) throw error;
  return data;
}

export async function createTrainingSession(session) {
  const { data, error } = await supabase.from("training_sessions").insert(session).select().single();
  if (error) throw error;
  return data;
}

export async function deleteTrainingSession(id) {
  const { error } = await supabase.from("training_sessions").delete().eq("id", id);
  if (error) throw error;
}

export async function listAttendanceForSession(sessionId) {
  const { data, error } = await supabase
    .from("attendance")
    .select("*, players(first_name, last_name, squad_number)")
    .eq("session_id", sessionId);
  if (error) throw error;
  return data;
}

export async function setAttendance(sessionId, playerId, present) {
  const { data, error } = await supabase
    .from("attendance")
    .upsert({ session_id: sessionId, player_id: playerId, present }, { onConflict: "session_id,player_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function listPlayerAttendance(seasonId) {
  const { data, error } = await supabase.from("v_player_attendance").select("*").eq("season_id", seasonId);
  if (error) throw error;
  return data;
}
