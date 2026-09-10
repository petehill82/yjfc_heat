import { ref, computed, onMounted } from "vue";
import { listFixtures, createFixture, updateFixture, deleteFixture } from "../api/fixtures.js";
import { store, isAdmin } from "../store.js";

const BLANK = { match_date: "", kickoff: "", team_name: "", opponent: "", home_away: "home", venue: "", competition: "", format: "", status: "scheduled", our_score: null, their_score: null };

export default {
  name: "FixturesView",
  setup() {
    const fixtures = ref([]);
    const showForm = ref(false);
    const draft = ref({ ...BLANK });
    const editingId = ref(null);
    const error = ref("");

    async function load() {
      fixtures.value = await listFixtures({ seasonId: store.currentSeasonId });
    }

    const grouped = computed(() => {
      const byDate = {};
      for (const f of fixtures.value) {
        (byDate[f.match_date] ||= []).push(f);
      }
      return Object.entries(byDate).sort(([a], [b]) => a.localeCompare(b));
    });

    function startAdd() { draft.value = { ...BLANK }; editingId.value = null; showForm.value = true; }
    function startEdit(f) { draft.value = { ...f }; editingId.value = f.id; showForm.value = true; }

    async function save() {
      error.value = "";
      try {
        const payload = {
          ...draft.value,
          season_id: store.currentSeasonId,
          our_score: draft.value.our_score === "" ? null : draft.value.our_score,
          their_score: draft.value.their_score === "" ? null : draft.value.their_score,
        };
        if (editingId.value) await updateFixture(editingId.value, payload);
        else await createFixture(payload);
        showForm.value = false;
        await load();
      } catch (e) { error.value = e.message; }
    }

    async function remove(f) {
      if (!confirm(`Delete fixture vs ${f.opponent} on ${f.match_date}?`)) return;
      await deleteFixture(f.id);
      await load();
    }

    onMounted(load);
    return { fixtures, grouped, showForm, draft, editingId, error, isAdmin, startAdd, startEdit, save, remove };
  },
  template: `
    <main class="container">
      <h2>Fixtures</h2>
      <button @click="startAdd">+ Add fixture</button>

      <article v-if="showForm">
        <form @submit.prevent="save">
          <div class="stat-grid">
            <label>Date <input v-model="draft.match_date" type="date" required /></label>
            <label>Kickoff <input v-model="draft.kickoff" type="time" /></label>
            <label>Our team label <input v-model="draft.team_name" placeholder="e.g. Orange (optional)" /></label>
            <label>Opponent <input v-model="draft.opponent" required /></label>
            <label>Home/Away
              <select v-model="draft.home_away"><option value="home">Home</option><option value="away">Away</option></select>
            </label>
            <label>Venue <input v-model="draft.venue" /></label>
            <label>Format <input v-model="draft.format" placeholder="e.g. 9v9" /></label>
            <label>Competition <input v-model="draft.competition" /></label>
            <label>Status
              <select v-model="draft.status">
                <option value="scheduled">Scheduled</option>
                <option value="played">Played</option>
                <option value="postponed">Postponed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </label>
            <label>Our score <input v-model="draft.our_score" type="number" min="0" /></label>
            <label>Their score <input v-model="draft.their_score" type="number" min="0" /></label>
          </div>
          <p v-if="error" style="color:#b91c1c;">{{ error }}</p>
          <button type="submit">Save fixture</button>
          <button type="button" class="secondary" @click="showForm = false">Cancel</button>
        </form>
      </article>

      <section v-for="[date, fx] in grouped" :key="date">
        <h4>{{ date }}</h4>
        <div class="matchday-columns">
          <article v-for="f in fx" :key="f.id">
            <header>
              <strong>{{ f.team_name || 'Team' }}</strong> vs {{ f.opponent }}
              <span class="tag">{{ f.home_away }}</span>
              <span class="tag">{{ f.status }}</span>
            </header>
            <p v-if="f.status === 'played'">Result: {{ f.our_score }} - {{ f.their_score }}</p>
            <p style="font-size:0.85rem; opacity:0.75;">{{ f.venue }} <span v-if="f.kickoff">&middot; {{ f.kickoff }}</span></p>
            <footer style="display:flex; gap:0.5rem; flex-wrap:wrap;">
              <router-link :to="'/matchday/' + f.match_date"><button class="outline" style="width:auto;">Pick team</button></router-link>
              <router-link :to="'/team-sheet/' + f.id"><button class="outline" style="width:auto;">Team sheet</button></router-link>
              <router-link :to="'/match-stats/' + f.id"><button class="outline" style="width:auto;">Stats</button></router-link>
              <button class="secondary" style="width:auto;" @click="startEdit(f)">Edit</button>
              <button v-if="isAdmin()" class="secondary outline" style="width:auto;" @click="remove(f)">Delete</button>
            </footer>
          </article>
        </div>
      </section>
      <p v-if="!fixtures.length">No fixtures yet for this season.</p>
    </main>
  `,
};
