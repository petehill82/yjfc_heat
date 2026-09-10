import { ref, reactive, onMounted } from "vue";
import { getFixture, updateFixture } from "../api/fixtures.js";
import { listAppearancesForFixture, upsertAppearance } from "../api/appearances.js";

export default {
  name: "MatchStatsView",
  props: { id: String },
  setup(props) {
    const fixture = ref(null);
    const rows = reactive({});      // player_id -> appearance row (editable copy)
    const order = ref([]);          // player_id order for display
    const saving = ref(false);
    const savedAt = ref("");

    async function load() {
      fixture.value = await getFixture(props.id);
      const apps = (await listAppearancesForFixture(props.id)).filter((a) => a.selected);
      apps.sort((a, b) => (a.starting === b.starting ? 0 : a.starting ? -1 : 1));
      order.value = apps.map((a) => a.player_id);
      for (const a of apps) rows[a.player_id] = { ...a };
    }

    function playerName(pid) {
      const r = rows[pid];
      return `${r.players?.first_name ?? ""} ${r.players?.last_name ?? ""}`.trim();
    }

    async function saveRow(pid) {
      const r = rows[pid];
      saving.value = true;
      try {
        await upsertAppearance({
          fixture_id: props.id,
          player_id: pid,
          selected: true,
          starting: r.starting,
          shirt_number: r.shirt_number,
          position: r.position,
          minutes_played: Number(r.minutes_played) || 0,
          minutes_in_goal: Number(r.minutes_in_goal) || 0,
          goals: Number(r.goals) || 0,
          assists: Number(r.assists) || 0,
          rating: r.rating === "" || r.rating == null ? null : Number(r.rating),
          potm: !!r.potm,
        });
        savedAt.value = new Date().toLocaleTimeString();
      } finally {
        saving.value = false;
      }
    }

    async function setPotm(pid) {
      // Only one POTM per fixture - clear it from anyone else and persist that too.
      const toClear = order.value.filter((other) => other !== pid && rows[other].potm);
      rows[pid].potm = true;
      await Promise.all([...toClear.map((other) => { rows[other].potm = false; return saveRow(other); }), saveRow(pid)]);
    }

    async function saveScore() {
      await updateFixture(props.id, {
        our_score: fixture.value.our_score === "" ? null : Number(fixture.value.our_score),
        their_score: fixture.value.their_score === "" ? null : Number(fixture.value.their_score),
        status: "played",
      });
    }

    onMounted(load);
    return { fixture, rows, order, saving, savedAt, playerName, saveRow, setPotm, saveScore };
  },
  template: `
    <main class="container" v-if="fixture">
      <h2>Match stats vs {{ fixture.opponent }}</h2>
      <article>
        <div style="display:flex; gap:1rem; align-items:center;">
          <label>Our score <input v-model="fixture.our_score" type="number" min="0" style="width:5rem;" /></label>
          <label>Their score <input v-model="fixture.their_score" type="number" min="0" style="width:5rem;" /></label>
          <button style="width:auto;" @click="saveScore">Save result</button>
        </div>
      </article>

      <p style="font-size:0.85rem; opacity:0.7;">
        <span v-if="saving">Saving...</span><span v-else-if="savedAt">Saved {{ savedAt }}</span>
      </p>

      <div v-for="pid in order" :key="pid" class="player-row" style="flex-wrap:wrap;">
        <span style="flex:1; min-width:140px;">{{ playerName(pid) }} <span v-if="rows[pid].starting" class="tag">Start</span></span>
        <label>Mins <input v-model="rows[pid].minutes_played" type="number" min="0" max="200" style="width:4rem;" @change="saveRow(pid)" /></label>
        <label>Mins GK <input v-model="rows[pid].minutes_in_goal" type="number" min="0" style="width:4rem;" @change="saveRow(pid)" /></label>
        <label>Goals <input v-model="rows[pid].goals" type="number" min="0" style="width:3.5rem;" @change="saveRow(pid)" /></label>
        <label>Assists <input v-model="rows[pid].assists" type="number" min="0" style="width:3.5rem;" @change="saveRow(pid)" /></label>
        <label>Rating <input v-model="rows[pid].rating" type="number" min="0" max="10" step="0.5" style="width:4rem;" @change="saveRow(pid)" /></label>
        <label style="display:flex; align-items:center; gap:0.25rem;">
          <input type="checkbox" :checked="rows[pid].potm" @change="setPotm(pid)" /> POTM
        </label>
      </div>
      <p v-if="!order.length">No players selected for this fixture yet - pick a team first.</p>
    </main>
  `,
};
