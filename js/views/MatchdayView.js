import { ref, reactive, computed, onMounted } from "vue";
import { listFixturesOnDate } from "../api/fixtures.js";
import { listPlayers } from "../api/players.js";
import { listAvailabilityForDate } from "../api/availability.js";
import { listAppearancesForFixture, upsertAppearance } from "../api/appearances.js";
import PlayerPicker from "../components/PlayerPicker.js";

export default {
  name: "MatchdayView",
  components: { PlayerPicker },
  props: { date: String },
  setup(props) {
    const fixtures = ref([]);
    const players = ref([]);
    const availability = ref({});
    const rowsByFixture = reactive({}); // fixture_id -> { player_id -> row }
    const saving = ref(false);
    const savedAt = ref("");

    async function load() {
      fixtures.value = await listFixturesOnDate(props.date);
      players.value = await listPlayers({ activeOnly: true });

      const avail = await listAvailabilityForDate(props.date);
      const availMap = {};
      for (const a of avail) availMap[a.player_id] = a.status;
      availability.value = availMap;

      for (const f of fixtures.value) {
        const apps = await listAppearancesForFixture(f.id);
        const map = {};
        for (const a of apps) map[a.player_id] = a;
        rowsByFixture[f.id] = map;
      }
    }

    // players selected on more than one fixture today
    const duplicatesByFixture = computed(() => {
      const countByPlayer = {};
      for (const f of fixtures.value) {
        const rows = rowsByFixture[f.id] || {};
        for (const [pid, row] of Object.entries(rows)) {
          if (row.selected) countByPlayer[pid] = (countByPlayer[pid] || 0) + 1;
        }
      }
      const result = {};
      for (const f of fixtures.value) {
        const rows = rowsByFixture[f.id] || {};
        const dup = new Set();
        for (const [pid, row] of Object.entries(rows)) {
          if (row.selected && countByPlayer[pid] > 1) dup.add(pid);
        }
        result[f.id] = dup;
      }
      return result;
    });

    async function onChange(fixtureId, playerId, patch) {
      const current = rowsByFixture[fixtureId][playerId] || { fixture_id: fixtureId, player_id: playerId };
      const updated = { ...current, ...patch, fixture_id: fixtureId, player_id: playerId };
      rowsByFixture[fixtureId][playerId] = updated;
      saving.value = true;
      try {
        await upsertAppearance(updated);
        savedAt.value = new Date().toLocaleTimeString();
      } finally {
        saving.value = false;
      }
    }

    onMounted(load);
    return { fixtures, players, availability, rowsByFixture, duplicatesByFixture, saving, savedAt, onChange };
  },
  template: `
    <main class="container">
      <h2>Matchday: {{ date }}</h2>
      <p style="font-size:0.85rem; opacity:0.7;">
        Changes save automatically. <span v-if="saving">Saving...</span>
        <span v-else-if="savedAt">Saved {{ savedAt }}</span>
      </p>
      <div class="matchday-columns">
        <article v-for="f in fixtures" :key="f.id">
          <header><strong>{{ f.team_name || 'Team' }}</strong> vs {{ f.opponent }} <span class="tag">{{ f.home_away }}</span></header>
          <PlayerPicker
            :players="players"
            :rows="rowsByFixture[f.id] || {}"
            :availability="availability"
            :duplicate-ids="duplicatesByFixture[f.id] || new Set()"
            @change="(pid, patch) => onChange(f.id, pid, patch)"
          />
        </article>
      </div>
      <p v-if="!fixtures.length">No fixtures scheduled on this date.</p>
    </main>
  `,
};
