import { ref, onMounted } from "vue";
import { listCoaches, setCoachRole, updateProfile } from "../api/profiles.js";
import { listSeasons, createSeason, updateSeason, setCurrentSeason } from "../api/seasons.js";
import { getClubSettings, updateClubSettings } from "../api/clubSettings.js";
import { store, loadSeasons } from "../store.js";
import { coachDisplayName } from "../lib/format.js";
import { DEFAULT_GAME_MINUTES, DEFAULT_PLAYERS_ON_PITCH } from "../lib/matchFormat.js";
import { useLoader } from "../lib/useLoader.js";

export default {
  name: "AdminView",
  setup() {
    const coaches = ref([]);
    const seasons = ref([]);
    const club = ref({ club_name: "", badge_path: "", primary_colour: "" });
    const newSeason = ref({
      name: "", squad_name: "", start_date: "", end_date: "",
      game_minutes: DEFAULT_GAME_MINUTES, players_on_pitch: DEFAULT_PLAYERS_ON_PITCH,
    });
    const error = ref("");

    const { error: loadError, run: load } = useLoader(async () => {
      coaches.value = await listCoaches();
      seasons.value = await listSeasons();
      club.value = await getClubSettings();
    });

    async function toggleRole(c) {
      const role = c.role === "admin" ? "coach" : "admin";
      await setCoachRole(c.id, role);
      await load();
    }

    async function saveCoach(c) {
      await updateProfile(c.id, { first_name: c.first_name, last_name: c.last_name, display_name: c.display_name });
    }

    async function addSeason() {
      error.value = "";
      try {
        await createSeason({
          ...newSeason.value,
          game_minutes: Number(newSeason.value.game_minutes) || DEFAULT_GAME_MINUTES,
          players_on_pitch: Number(newSeason.value.players_on_pitch) || DEFAULT_PLAYERS_ON_PITCH,
        });
        newSeason.value = {
          name: "", squad_name: "", start_date: "", end_date: "",
          game_minutes: DEFAULT_GAME_MINUTES, players_on_pitch: DEFAULT_PLAYERS_ON_PITCH,
        };
        await load();
        await loadSeasons();
      } catch (e) { error.value = e.message; }
    }

    async function saveSeason(s) {
      await updateSeason(s.id, {
        name: s.name, squad_name: s.squad_name, start_date: s.start_date, end_date: s.end_date,
        game_minutes: Number(s.game_minutes) || DEFAULT_GAME_MINUTES,
        players_on_pitch: Number(s.players_on_pitch) || DEFAULT_PLAYERS_ON_PITCH,
      });
      await loadSeasons();
    }

    async function makeCurrent(s) {
      await setCurrentSeason(s.id);
      await load();
      await loadSeasons();
    }

    async function saveClub() {
      await updateClubSettings(club.value);
      store.clubSettings = club.value;
    }

    onMounted(load);
    return { coaches, seasons, club, newSeason, error, loadError, load, coachDisplayName, toggleRole, saveCoach, addSeason, saveSeason, makeCurrent, saveClub };
  },
  template: `
    <main class="container">
      <h2>Admin</h2>
      <p v-if="loadError" class="tag warn">{{ loadError }} <a href="#" @click.prevent="load">Retry</a></p>

      <h3>Coaches</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead><tr><th>First name</th><th>Last name</th><th>Display name</th><th>Role</th><th></th></tr></thead>
          <tbody>
            <tr v-for="c in coaches" :key="c.id">
              <td><input v-model="c.first_name" @change="saveCoach(c)" style="width:8rem;" /></td>
              <td><input v-model="c.last_name" @change="saveCoach(c)" style="width:8rem;" /></td>
              <td><input v-model="c.display_name" @change="saveCoach(c)" :placeholder="coachDisplayName(c)" style="width:10rem;" /></td>
              <td><span class="tag" :class="{ ok: c.role === 'admin' }">{{ c.role }}</span></td>
              <td><button class="outline" style="width:auto;" @click="toggleRole(c)">
                Make {{ c.role === 'admin' ? 'coach' : 'admin' }}
              </button></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="font-size:0.85rem; opacity:0.7;">
        Shown around the app as: display name if set, else first + last name, else their invite email.
        To invite a new coach, use the Supabase dashboard: Authentication &rarr; Users &rarr; Invite user.
      </p>

      <h3>Seasons</h3>
      <div style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Name</th><th>Squad name</th><th>Start</th><th>End</th>
              <th>Game mins</th><th>Players on pitch</th><th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="s in seasons" :key="s.id" :class="{ current: s.is_current }">
              <td><input v-model="s.name" @change="saveSeason(s)" style="width:8rem;" /></td>
              <td><input v-model="s.squad_name" @change="saveSeason(s)" style="width:10rem;" /></td>
              <td><input v-model="s.start_date" type="date" @change="saveSeason(s)" /></td>
              <td><input v-model="s.end_date" type="date" @change="saveSeason(s)" /></td>
              <td><input v-model="s.game_minutes" type="number" min="1" @change="saveSeason(s)" style="width:4.5rem;" /></td>
              <td><input v-model="s.players_on_pitch" type="number" min="1" @change="saveSeason(s)" style="width:4.5rem;" /></td>
              <td>
                <span v-if="s.is_current" class="tag ok">Current</span>
                <button v-else class="outline" style="width:auto;" @click="makeCurrent(s)">Set current</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="font-size:0.85rem; opacity:0.7;">
        Game mins / players on pitch drive the "fair minutes" default on Match Stats and the fair-rotation
        note on Live scoring - update them here when a season's format changes (e.g. moving up an age group).
      </p>
      <form @submit.prevent="addSeason" style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:end;">
        <input v-model="newSeason.name" placeholder="Name e.g. 2027/28" required />
        <input v-model="newSeason.squad_name" placeholder="Squad name e.g. Lions U12s" required />
        <input v-model="newSeason.start_date" type="date" />
        <input v-model="newSeason.end_date" type="date" />
        <label style="font-size:0.8rem;">Game mins <input v-model="newSeason.game_minutes" type="number" min="1" style="width:4.5rem;" /></label>
        <label style="font-size:0.8rem;">Players on pitch <input v-model="newSeason.players_on_pitch" type="number" min="1" style="width:4.5rem;" /></label>
        <button type="submit" style="width:auto;">+ Add season</button>
      </form>
      <p v-if="error" style="color:#b91c1c;">{{ error }}</p>

      <h3>Club branding</h3>
      <form @submit.prevent="saveClub">
        <label>Club name <input v-model="club.club_name" /></label>
        <label>Badge path <input v-model="club.badge_path" placeholder="assets/badge.svg" /></label>
        <p style="font-size:0.85rem; opacity:0.7;">
          Replace <code>assets/badge.svg</code> (or drop in a new file and update this path) with your real club badge.
        </p>
        <button type="submit" style="width:auto;">Save</button>
      </form>
    </main>
  `,
};
