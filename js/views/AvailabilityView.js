import { ref, reactive, computed, onMounted } from "vue";
import { listPlayers } from "../api/players.js";
import { listUpcomingFixtures } from "../api/fixtures.js";
import { listUpcomingAvailability, setAvailability } from "../api/availability.js";

const CYCLE = ["unknown", "available", "unavailable"];
const LABEL = { unknown: "?", available: "✓", unavailable: "✗" };
const CLASS = { unknown: "tag", available: "tag ok", unavailable: "tag warn" };

export default {
  name: "AvailabilityView",
  setup() {
    const players = ref([]);
    const dates = ref([]); // distinct upcoming match dates
    const grid = reactive({}); // `${playerId}|${date}` -> status

    async function load() {
      players.value = await listPlayers({ activeOnly: true });
      const fixtures = await listUpcomingFixtures(20);
      dates.value = [...new Set(fixtures.map((f) => f.match_date))].sort();
      if (!dates.value.length) return;
      const from = dates.value[0];
      const to = dates.value[dates.value.length - 1];
      const rows = await listUpcomingAvailability(from, to);
      for (const r of rows) grid[`${r.player_id}|${r.on_date}`] = r.status;
    }

    function statusFor(pid, date) {
      return grid[`${pid}|${date}`] || "unknown";
    }

    async function cycle(pid, date) {
      const current = statusFor(pid, date);
      const next = CYCLE[(CYCLE.indexOf(current) + 1) % CYCLE.length];
      grid[`${pid}|${date}`] = next;
      await setAvailability(pid, date, next);
    }

    onMounted(load);
    return { players, dates, statusFor, cycle, LABEL, CLASS };
  },
  template: `
    <main class="container">
      <h2>Availability</h2>
      <p v-if="!dates.length">No upcoming fixtures to mark availability for yet.</p>
      <div v-else style="overflow-x:auto;">
        <table>
          <thead>
            <tr><th>Player</th><th v-for="d in dates" :key="d">{{ d.slice(5) }}</th></tr>
          </thead>
          <tbody>
            <tr v-for="p in players" :key="p.id">
              <td>{{ p.first_name }} {{ p.last_name }}</td>
              <td v-for="d in dates" :key="d">
                <button class="outline" style="width:auto; padding:0.1rem 0.6rem;" @click="cycle(p.id, d)">
                  <span :class="CLASS[statusFor(p.id, d)]">{{ LABEL[statusFor(p.id, d)] }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="font-size:0.8rem; opacity:0.7;">Tap a cell to cycle: unknown &rarr; available &rarr; unavailable.</p>
    </main>
  `,
};
