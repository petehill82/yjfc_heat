import { ref, onMounted } from "vue";
import { getPlayer, updatePlayer, getPlayerSeasonStats, getPlayerAppearances } from "../api/players.js";
import { store, isAdmin } from "../store.js";

export default {
  name: "PlayerDetailView",
  props: { id: String },
  setup(props) {
    const player = ref(null);
    const editing = ref(false);
    const draft = ref({});
    const seasonStats = ref(null);
    const appearances = ref([]);
    const error = ref("");

    async function load() {
      player.value = await getPlayer(props.id);
      appearances.value = await getPlayerAppearances(props.id);
      if (store.currentSeasonId) {
        seasonStats.value = await getPlayerSeasonStats(props.id, store.currentSeasonId);
      }
    }

    function startEdit() {
      draft.value = {
        ...player.value,
        preferred_positions: (player.value.preferred_positions || []).join(", "),
      };
      editing.value = true;
    }

    async function save() {
      error.value = "";
      try {
        const patch = {
          ...draft.value,
          squad_number: draft.value.squad_number ? Number(draft.value.squad_number) : null,
          year_of_birth: draft.value.year_of_birth ? Number(draft.value.year_of_birth) : null,
          preferred_positions: draft.value.preferred_positions
            ? draft.value.preferred_positions.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        };
        delete patch.id; delete patch.created_at;
        player.value = await updatePlayer(props.id, patch);
        editing.value = false;
      } catch (e) {
        error.value = e.message;
      }
    }

    onMounted(load);
    return { player, editing, draft, seasonStats, appearances, error, isAdmin, startEdit, save };
  },
  template: `
    <main class="container" v-if="player">
      <p><router-link to="/players">&larr; Back to squad</router-link></p>
      <h2>{{ player.first_name }} {{ player.last_name }}
        <span class="tag">#{{ player.squad_number ?? '-' }}</span>
      </h2>

      <div v-if="!editing">
        <p>Positions: {{ (player.preferred_positions || []).join(', ') || 'n/a' }} &middot;
           Year of birth: {{ player.year_of_birth ?? 'n/a' }}</p>
        <p v-if="player.notes">{{ player.notes }}</p>
        <button v-if="isAdmin()" class="secondary" style="width:auto;" @click="startEdit">Edit details</button>
      </div>
      <form v-else @submit.prevent="save">
        <div class="stat-grid">
          <input v-model="draft.first_name" placeholder="First name" required />
          <input v-model="draft.last_name" placeholder="Last name" required />
          <input v-model="draft.squad_number" type="number" placeholder="Squad no." />
          <input v-model="draft.year_of_birth" type="number" placeholder="Year of birth" />
          <input v-model="draft.preferred_positions" placeholder="Positions (comma sep.)" />
        </div>
        <textarea v-model="draft.notes" placeholder="Notes"></textarea>
        <p v-if="error" style="color:#b91c1c;">{{ error }}</p>
        <button type="submit">Save</button>
        <button type="button" class="secondary" @click="editing = false">Cancel</button>
      </form>

      <h3>This season</h3>
      <div class="stat-grid" v-if="seasonStats">
        <article><strong>{{ seasonStats.apps }}</strong><br>Appearances</article>
        <article><strong>{{ seasonStats.goals }}</strong><br>Goals</article>
        <article><strong>{{ seasonStats.assists }}</strong><br>Assists</article>
        <article><strong>{{ seasonStats.minutes_played }}</strong><br>Minutes</article>
        <article><strong>{{ seasonStats.minutes_in_goal }}</strong><br>Mins in goal</article>
        <article><strong>{{ seasonStats.potm_count }}</strong><br>POTM</article>
        <article><strong>{{ seasonStats.avg_rating ?? '-' }}</strong><br>Avg rating</article>
      </div>
      <p v-else>No appearances recorded yet this season.</p>

      <h3>Match history</h3>
      <table>
        <thead><tr><th>Date</th><th>Opponent</th><th>H/A</th><th>Mins</th><th>G</th><th>A</th></tr></thead>
        <tbody>
          <tr v-for="a in appearances" :key="a.fixture_id">
            <td>{{ a.fixtures?.match_date }}</td>
            <td>{{ a.fixtures?.opponent }} <small v-if="a.fixtures?.team_name">({{ a.fixtures.team_name }})</small></td>
            <td>{{ a.fixtures?.home_away }}</td>
            <td>{{ a.minutes_played }}</td>
            <td>{{ a.goals }}</td>
            <td>{{ a.assists }}</td>
          </tr>
        </tbody>
      </table>
    </main>
  `,
};
