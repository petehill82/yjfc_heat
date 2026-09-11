import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from "vue";
import {
  Chart, BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip,
} from "chart.js";
import { store, currentSeason } from "../store.js";
import { playerSeasonStats, teamResults } from "../api/stats.js";
import { listUpcomingFixtures } from "../api/fixtures.js";
import StatTile from "../components/StatTile.js";

Chart.register(BarController, BarElement, CategoryScale, LinearScale, Legend, Tooltip);

// Colors: club orange for "us/home", categorical blue for the paired series -
// both drawn from the dataviz skill's validated 3-slot order (blue, orange, aqua).
const ORANGE = "#eb6834";
const BLUE = "#2a78d6";
const AQUA = "#1baf7a";
const INK_SECONDARY = "#52514e";
const GRID = "#e1e0d9";
const GOOD = "#0ca30c";
const CRITICAL = "#d03b3b";
const NEUTRAL = "#898781";

const BASE_OPTS = {
  responsive: true,
  maintainAspectRatio: false,
  scales: {
    x: { grid: { display: false }, ticks: { color: INK_SECONDARY } },
    y: { grid: { color: GRID, drawTicks: false }, ticks: { color: INK_SECONDARY }, beginAtZero: true },
  },
  plugins: {
    legend: { labels: { color: INK_SECONDARY, boxWidth: 12 } },
    tooltip: { enabled: true },
  },
};

export default {
  name: "DashboardView",
  components: { StatTile },
  setup() {
    const players = ref([]);
    const teams = ref([]);
    const upcoming = ref([]);
    const charts = {};
    const leaderboardCanvas = ref(null);
    const matchesCanvas = ref(null);
    const potmCanvas = ref(null);
    const goalkeepingCanvas = ref(null);
    const homeAwayCanvas = ref(null);

    const totals = computed(() => {
      const t = teams.value.reduce((acc, r) => {
        acc.played += r.played; acc.wins += r.wins; acc.draws += r.draws; acc.losses += r.losses;
        acc.gf += r.goals_for; acc.ga += r.goals_against;
        return acc;
      }, { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 });
      return t;
    });

    function destroyCharts() {
      for (const c of Object.values(charts)) c?.destroy();
    }

    function buildLeaderboard() {
      const top = [...players.value]
        .sort((a, b) => (b.goals + b.assists) - (a.goals + a.assists))
        .slice(0, 8);
      charts.leaderboard?.destroy();
      charts.leaderboard = new Chart(leaderboardCanvas.value, {
        type: "bar",
        data: {
          labels: top.map((p) => `${p.first_name} ${p.last_name[0]}.`),
          datasets: [
            { label: "Goals", data: top.map((p) => p.goals), backgroundColor: ORANGE, borderRadius: 4, borderSkipped: false, barThickness: 18, categoryPercentage: 0.7, barPercentage: 0.9 },
            { label: "Assists", data: top.map((p) => p.assists), backgroundColor: BLUE, borderRadius: 4, borderSkipped: false, barThickness: 18, categoryPercentage: 0.7, barPercentage: 0.9 },
          ],
        },
        options: { ...BASE_OPTS, indexAxis: "y" },
      });
    }

    function buildMatchesPlayed() {
      const sorted = [...players.value].sort((a, b) => b.apps - a.apps);
      charts.matches?.destroy();
      charts.matches = new Chart(matchesCanvas.value, {
        type: "bar",
        data: {
          labels: sorted.map((p) => `${p.first_name} ${p.last_name[0]}.`),
          datasets: [{ label: "Matches played", data: sorted.map((p) => p.apps), backgroundColor: ORANGE, borderRadius: 4, borderSkipped: false, categoryPercentage: 0.7, barPercentage: 0.9 }],
        },
        options: { ...BASE_OPTS, indexAxis: "y", plugins: { ...BASE_OPTS.plugins, legend: { display: false } } },
      });
    }

    function buildPotm() {
      const sorted = [...players.value].sort((a, b) => b.potm_count - a.potm_count);
      charts.potm?.destroy();
      charts.potm = new Chart(potmCanvas.value, {
        type: "bar",
        data: {
          labels: sorted.map((p) => `${p.first_name} ${p.last_name[0]}.`),
          datasets: [{ label: "POTM awards", data: sorted.map((p) => p.potm_count), backgroundColor: BLUE, borderRadius: 4, borderSkipped: false, categoryPercentage: 0.7, barPercentage: 0.9 }],
        },
        options: {
          ...BASE_OPTS,
          indexAxis: "y",
          plugins: { ...BASE_OPTS.plugins, legend: { display: false } },
          scales: { ...BASE_OPTS.scales, x: { ...BASE_OPTS.scales.x, ticks: { ...BASE_OPTS.scales.x.ticks, stepSize: 1 } } },
        },
      });
    }

    function buildGoalkeeping() {
      const keepers = players.value.filter((p) => p.minutes_in_goal > 0)
        .sort((a, b) => b.minutes_in_goal - a.minutes_in_goal);
      charts.goalkeeping?.destroy();
      charts.goalkeeping = null;
      if (!keepers.length) return;
      charts.goalkeeping = new Chart(goalkeepingCanvas.value, {
        type: "bar",
        data: {
          labels: keepers.map((p) => `${p.first_name} ${p.last_name[0]}.`),
          datasets: [{ label: "Minutes in goal", data: keepers.map((p) => p.minutes_in_goal), backgroundColor: AQUA, borderRadius: 4, borderSkipped: false, categoryPercentage: 0.7, barPercentage: 0.9 }],
        },
        options: { ...BASE_OPTS, indexAxis: "y", plugins: { ...BASE_OPTS.plugins, legend: { display: false } } },
      });
    }

    function buildHomeAway() {
      const t = teams.value.reduce((acc, r) => {
        acc.wh += r.wins_home; acc.dh += r.draws_home; acc.lh += r.losses_home;
        acc.wa += r.wins_away; acc.da += r.draws_away; acc.la += r.losses_away;
        return acc;
      }, { wh: 0, dh: 0, lh: 0, wa: 0, da: 0, la: 0 });
      charts.homeAway?.destroy();
      charts.homeAway = new Chart(homeAwayCanvas.value, {
        type: "bar",
        data: {
          labels: ["Wins", "Draws", "Losses"],
          datasets: [
            { label: "Home", data: [t.wh, t.dh, t.lh], backgroundColor: ORANGE, borderRadius: 4, borderSkipped: false, barThickness: 24, categoryPercentage: 0.6, barPercentage: 0.9 },
            { label: "Away", data: [t.wa, t.da, t.la], backgroundColor: BLUE, borderRadius: 4, borderSkipped: false, barThickness: 24, categoryPercentage: 0.6, barPercentage: 0.9 },
          ],
        },
        options: BASE_OPTS,
      });
    }

    async function load() {
      const seasonId = store.currentSeasonId;
      if (!seasonId) return;
      players.value = await playerSeasonStats(seasonId);
      teams.value = await teamResults(seasonId);
      upcoming.value = await listUpcomingFixtures(5);
      await nextTick();
      buildLeaderboard();
      buildMatchesPlayed();
      buildPotm();
      buildGoalkeeping();
      buildHomeAway();
    }

    watch(() => store.currentSeasonId, load);
    onMounted(load);
    onBeforeUnmount(destroyCharts);

    return { players, teams, upcoming, totals, leaderboardCanvas, matchesCanvas, potmCanvas, goalkeepingCanvas, homeAwayCanvas, store, currentSeason, GOOD, CRITICAL, NEUTRAL };
  },
  template: `
    <main class="container">
      <h2>Dashboard</h2>
      <label v-if="store.seasons.length > 1">Season
        <select v-model="store.currentSeasonId">
          <option v-for="s in store.seasons" :key="s.id" :value="s.id">{{ s.name }} - {{ s.squad_name }}</option>
        </select>
      </label>

      <div class="stat-grid">
        <StatTile label="Played" :value="totals.played" />
        <StatTile label="Wins" :value="totals.wins" />
        <StatTile label="Draws" :value="totals.draws" />
        <StatTile label="Losses" :value="totals.losses" />
        <StatTile label="Goals for" :value="totals.gf" />
        <StatTile label="Goals against" :value="totals.ga" />
      </div>
      <p style="font-size:0.85rem;">
        <span class="tag" :style="{ background: '#dcfce7', color: GOOD }">&#9679; Wins</span>
        <span class="tag" :style="{ background: '#f4f4f2', color: NEUTRAL }">&#9679; Draws</span>
        <span class="tag" :style="{ background: '#fee2e2', color: CRITICAL }">&#9679; Losses</span>
      </p>

      <h3>Goals &amp; assists (top 8)</h3>
      <div style="height:280px;"><canvas ref="leaderboardCanvas"></canvas></div>

      <h3>Matches played (fairness check)</h3>
      <div :style="{ height: Math.max(220, players.length * 22) + 'px' }"><canvas ref="matchesCanvas"></canvas></div>

      <h3>Player of the Match (fairness check)</h3>
      <div :style="{ height: Math.max(220, players.length * 22) + 'px' }"><canvas ref="potmCanvas"></canvas></div>
      <p v-if="!players.some(p => p.potm_count > 0)" style="opacity:0.7;">No POTM awarded yet this season.</p>

      <h3>Minutes in goal</h3>
      <div style="height:220px;"><canvas ref="goalkeepingCanvas"></canvas></div>
      <p v-if="!players.some(p => p.minutes_in_goal > 0)" style="opacity:0.7;">No goalkeeping minutes recorded yet.</p>

      <h3>Home vs away results</h3>
      <div style="height:260px;"><canvas ref="homeAwayCanvas"></canvas></div>

      <h3>Upcoming fixtures</h3>
      <ul>
        <li v-for="f in upcoming" :key="f.id">
          {{ f.match_date }} vs {{ f.opponent }} <span class="tag">{{ f.home_away }}</span>
        </li>
      </ul>
      <p v-if="!upcoming.length">No upcoming fixtures scheduled.</p>
    </main>
  `,
};
