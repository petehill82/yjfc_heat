import { ref, watch, onMounted } from "vue";
import { store, currentSeason } from "../store.js";
import { listResults } from "../api/results.js";
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

    return { results, store, currentSeason, outcome, playerDisplayName, loadError, load };
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
          <tr><th>Date</th><th>Opponent</th><th>H/A</th><th>Score</th><th>Result</th><th>POTM</th></tr>
        </thead>
        <tbody>
          <tr v-for="r in results" :key="r.fixture_id">
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
              <router-link v-if="r.potm_player_id" :to="'/players/' + r.potm_player_id">
                {{ playerDisplayName({ first_name: r.potm_first_name, last_name: r.potm_last_name, display_name: r.potm_display_name }) }}
              </router-link>
              <span v-else style="opacity:0.6;">&ndash;</span>
            </td>
          </tr>
        </tbody>
      </table>
      <p v-if="!results.length">No results recorded yet this season.</p>
    </main>
  `,
};
