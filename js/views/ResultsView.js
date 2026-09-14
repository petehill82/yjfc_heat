import { ref, watch, onMounted } from "vue";
import { store, currentSeason } from "../store.js";
import { listResults } from "../api/results.js";
import { listAppearancesForFixture } from "../api/appearances.js";
import { playerDisplayName } from "../lib/format.js";
import { useLoader } from "../lib/useLoader.js";

function outcome(r) {
  if (r.our_score == null || r.their_score == null) return "";
  if (r.our_score > r.their_score) return "W";
  if (r.our_score < r.their_score) return "L";
  return "D";
}

export default {
  name: "ResultsView",
  setup() {
    const results = ref([]);

    const { error: loadError, run: load } = useLoader(async () => {
      const seasonId = store.currentSeasonId;
      if (!seasonId) return;
      results.value = await listResults(seasonId);
    });

    watch(() => store.currentSeasonId, load);
    onMounted(load);

    // Tap a result row to expand its scorers/assists inline, fetched lazily
    // (only the appearances for that one fixture) and cached so re-tapping
    // an already-viewed match doesn't re-fetch.
    const expandedId = ref(null);
    const detailsByFixture = ref({});
    const detailsLoading = ref(null);
    const detailsError = ref("");

    async function toggleDetails(fixtureId) {
      if (expandedId.value === fixtureId) { expandedId.value = null; return; }
      expandedId.value = fixtureId;
      if (detailsByFixture.value[fixtureId]) return;
      detailsLoading.value = fixtureId;
      detailsError.value = "";
      try {
        const apps = await listAppearancesForFixture(fixtureId);
        detailsByFixture.value[fixtureId] = apps.filter((a) => a.selected);
      } catch (e) {
        detailsError.value = "Couldn't load match details.";
      } finally {
        detailsLoading.value = null;
      }
    }

    function scorersFor(fixtureId) {
      return (detailsByFixture.value[fixtureId] || [])
        .filter((a) => a.goals > 0)
        .map((a) => playerDisplayName(a.players) + (a.goals > 1 ? ` x${a.goals}` : ""));
    }
    function assistsFor(fixtureId) {
      return (detailsByFixture.value[fixtureId] || [])
        .filter((a) => a.assists > 0)
        .map((a) => playerDisplayName(a.players) + (a.assists > 1 ? ` x${a.assists}` : ""));
    }

    return {
      results, store, currentSeason, outcome, playerDisplayName, loadError, load,
      expandedId, detailsLoading, detailsError, toggleDetails, scorersFor, assistsFor,
    };
  },
  template: `
    <main class="container">
      <h2>Results</h2>
      <p v-if="loadError" class="tag warn">{{ loadError }} <a href="#" @click.prevent="load">Retry</a></p>
      <label v-if="store.seasons.length > 1">Season
        <select v-model="store.currentSeasonId">
          <option v-for="s in store.seasons" :key="s.id" :value="s.id">{{ s.name }} - {{ s.squad_name }}</option>
        </select>
      </label>

      <table>
        <thead>
          <tr><th>Date</th><th>Opponent</th><th>H/A</th><th>Score</th><th>Result</th><th>POTM</th><th></th></tr>
        </thead>
        <tbody>
          <template v-for="r in results" :key="r.fixture_id">
            <tr style="cursor:pointer;" @click="toggleDetails(r.fixture_id)">
              <td>{{ r.match_date }}</td>
              <td>{{ r.opponent }} <small v-if="r.team_name">({{ r.team_name }})</small></td>
              <td>{{ r.home_away }}</td>
              <td>{{ r.our_score }}&ndash;{{ r.their_score }}</td>
              <td>
                <span v-if="outcome(r) === 'W'" class="tag ok">Win</span>
                <span v-else-if="outcome(r) === 'L'" class="tag warn">Loss</span>
                <span v-else class="tag">Draw</span>
              </td>
              <td>
                <router-link v-if="r.potm_player_id" :to="'/players/' + r.potm_player_id" @click.stop>
                  {{ playerDisplayName({ first_name: r.potm_first_name, last_name: r.potm_last_name, display_name: r.potm_display_name }) }}
                </router-link>
                <span v-else style="opacity:0.6;">&ndash;</span>
              </td>
              <td style="opacity:0.6;">{{ expandedId === r.fixture_id ? '▾' : '▸' }}</td>
            </tr>
            <tr v-if="expandedId === r.fixture_id">
              <td colspan="7" style="background:var(--chalk);">
                <p v-if="detailsLoading === r.fixture_id" aria-busy="true">Loading...</p>
                <p v-else-if="detailsError" class="tag warn">{{ detailsError }}</p>
                <template v-else>
                  <p v-if="scorersFor(r.fixture_id).length" style="margin:0.25rem 0;"><strong>&#9917; Scorers:</strong> {{ scorersFor(r.fixture_id).join(', ') }}</p>
                  <p v-if="assistsFor(r.fixture_id).length" style="margin:0.25rem 0;"><strong>&#127939; Assists:</strong> {{ assistsFor(r.fixture_id).join(', ') }}</p>
                  <p v-if="!scorersFor(r.fixture_id).length && !assistsFor(r.fixture_id).length" style="opacity:0.7; margin:0.25rem 0;">
                    No goals or assists recorded for this match.
                  </p>
                </template>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
      <p v-if="!results.length">No results recorded yet this season.</p>
    </main>
  `,
};
