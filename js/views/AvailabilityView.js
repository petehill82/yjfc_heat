import { ref, reactive, onMounted } from "vue";
import { listPlayers } from "../api/players.js";
import { listUpcomingFixtures } from "../api/fixtures.js";
import { listUpcomingAvailability, setAvailability, setAvailabilityBulk } from "../api/availability.js";
import { playerDisplayName } from "../lib/format.js";

const CYCLE = ["unknown", "available", "unavailable"];
const LABEL = { unknown: "?", available: "\u2713", unavailable: "\u2717" };
const CLASS = { unknown: "tag", available: "tag ok", unavailable: "tag warn" };

export default {
  name: "AvailabilityView",
  setup() {
    const players = ref([]);
    const dates = ref([]); // distinct upcoming match dates
    const grid = reactive({}); // `${playerId}|${date}` -> status
    const bulkBusy = ref("");

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

    // The common case is everyone's available - set the whole column in one
    // go, then flip the few exceptions off individually.
    async function markAllAvailable(date) {
      bulkBusy.value = date;
      try {
        for (const p of players.value) grid[`${p.id}|${date}`] = "available";
        const rows = players.value.map((p) => ({ player_id: p.id, on_date: date, status: "available" }));
        await setAvailabilityBulk(rows);
      } finally {
        bulkBusy.value = "";
      }
    }

    onMounted(load);
    return { players, dates, statusFor, cycle, markAllAvailable, bulkBusy, LABEL, CLASS, playerDisplayName };
  },
  template: `
    <main class="container">
      <h2>Availability</h2>
      <p v-if="!dates.length">No upcoming fixtures to mark availability for yet.</p>
      <div v-else style="overflow-x:auto;">
        <table>
          <thead>
            <tr>
              <th>Player</th>
              <th v-for="d in dates" :key="d">
                {{ d.slice(5) }}<br />
                <button class="outline" :aria-busy="bulkBusy === d" style="width:auto; padding:0.1rem 0.5rem; font-size:0.7rem;"
                        @click="markAllAvailable(d)">All available</button>
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="p in players" :key="p.id">
              <td>{{ playerDisplayName(p) }}</td>
              <td v-for="d in dates" :key="d">
                <button class="outline" style="width:auto; padding:0.1rem 0.6rem;" @click="cycle(p.id, d)">
                  <span :class="CLASS[statusFor(p.id, d)]">{{ LABEL[statusFor(p.id, d)] }}</span>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p style="font-size:0.8rem; opacity:0.7;">
        "All available" sets everyone for that date in one go - then tap a cell to cycle
        just the exceptions: unknown &rarr; available &rarr; unavailable.
      </p>
    </main>
  `,
};
