// Small shared reactive store (no Pinia needed for an app this size).
import { reactive } from "vue";
import { supabase, getSessionUser, getMyProfile } from "./supabase.js";

export const store = reactive({
  ready: false,          // auth state has been checked at least once
  user: null,            // Supabase auth user, or null
  profile: null,         // { id, full_name, role }
  seasons: [],
  currentSeasonId: null,
  clubSettings: { club_name: "My Club", badge_path: "assets/badge.svg" },
});

export function isAdmin() {
  return store.profile?.role === "admin";
}

export function currentSeason() {
  return store.seasons.find((s) => s.id === store.currentSeasonId) || null;
}

export async function refreshAuth() {
  const previousUserId = store.user?.id ?? null;
  store.user = await getSessionUser();
  store.profile = store.user ? await getMyProfile() : null;
  store.ready = true;

  // Load (or clear) squad-wide data whenever the signed-in user changes -
  // covers first load, sign-in, sign-out and switching accounts.
  if (store.user && store.user.id !== previousUserId) {
    await Promise.all([loadSeasons(), loadClubSettings()]);
  } else if (!store.user) {
    store.seasons = [];
    store.currentSeasonId = null;
  }
}

export async function loadSeasons() {
  const { data, error } = await supabase
    .from("seasons")
    .select("*")
    .order("start_date", { ascending: false });
  if (error) {
    console.error("loadSeasons failed:", error.message);
    return;
  }
  store.seasons = data || [];
  const current = store.seasons.find((s) => s.is_current);
  store.currentSeasonId = current?.id || store.seasons[0]?.id || null;
}

export async function loadClubSettings() {
  const { data, error } = await supabase
    .from("club_settings")
    .select("*")
    .eq("id", 1)
    .single();
  if (!error && data) store.clubSettings = data;
}

supabase.auth.onAuthStateChange(() => {
  refreshAuth();
});
