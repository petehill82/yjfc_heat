import { ref, onMounted } from "vue";
import { listCoaches, setCoachRole } from "../api/profiles.js";
import { listSeasons, createSeason, updateSeason, setCurrentSeason } from "../api/seasons.js";
import { getClubSettings, updateClubSettings } from "../api/clubSettings.js";
import { store, loadSeasons } from "../store.js";

export default {
  name: "AdminView",
  setup() {
    const coaches = ref([]);
    const seasons = ref([]);
    const club = ref({ club_name: "", badge_path: "", primary_colour: "" });
    const newSeason = ref({ name: "", squad_name: "", start_date: "", end_date: "" });
    const error = ref("");

    async function load() {
      coaches.value = await listCoaches();
      seasons.value = await listSeasons();
      club.value = await getClubSettings();
    }

    async function toggleRole(c) {
      const role = c.role === "admin" ? "coach" : "admin";
      await setCoachRole(c.id, role);
      await load();
    }

    async function addSeason() {
      error.value = "";
      try {
        await createSeason({ ...newSeason.value });
        newSeason.value = { name: "", squad_name: "", start_date: "", end_date: "" };
        await load();
        await loadSeasons();
      } catch (e) { error.value = e.message; }
    }

    async function saveSeason(s) {
      await updateSeason(s.id, { name: s.name, squad_name: s.squad_name, start_date: s.start_date, end_date: s.end_date });
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
    return { coaches, seasons, club, newSeason, error, toggleRole, addSeason, saveSeason, makeCurrent, saveClub };
  },
  template: `
    <main class="container">
      <h2>Admin</h2>

      <h3>Coaches</h3>
      <table>
        <thead><tr><th>Name</th><th>Role</th><th></th></tr></thead>
        <tbody>
          <tr v-for="c in coaches" :key="c.id">
            <td>{{ c.full_name }}</td>
            <td><span class="tag" :class="{ ok: c.role === 'admin' }">{{ c.role }}</span></td>
            <td><button class="outline" style="width:auto;" @click="toggleRole(c)">
              Make {{ c.role === 'admin' ? 'coach' : 'admin' }}
            </button></td>
          </tr>
        </tbody>
      </table>
      <p style="font-size:0.85rem; opacity:0.7;">
        To invite a new coach, use the Supabase dashboard: Authentication &rarr; Users &rarr; Invite user.
      </p>

      <h3>Seasons</h3>
      <table>
        <thead><tr><th>Name</th><th>Squad name</th><th>Start</th><th>End</th><th></th></tr></thead>
        <tbody>
          <tr v-for="s in seasons" :key="s.id" :class="{ current: s.is_current }">
            <td><input v-model="s.name" @change="saveSeason(s)" style="width:8rem;" /></td>
            <td><input v-model="s.squad_name" @change="saveSeason(s)" style="width:10rem;" /></td>
            <td><input v-model="s.start_date" type="date" @change="saveSeason(s)" /></td>
            <td><input v-model="s.end_date" type="date" @change="saveSeason(s)" /></td>
            <td>
              <span v-if="s.is_current" class="tag ok">Current</span>
              <button v-else class="outline" style="width:auto;" @click="makeCurrent(s)">Set current</button>
            </td>
          </tr>
        </tbody>
      </table>
      <form @submit.prevent="addSeason" style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:end;">
        <input v-model="newSeason.name" placeholder="Name e.g. 2027/28" required />
        <input v-model="newSeason.squad_name" placeholder="Squad name e.g. Lions U12s" required />
        <input v-model="newSeason.start_date" type="date" />
        <input v-model="newSeason.end_date" type="date" />
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
