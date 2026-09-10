import { ref, onMounted } from "vue";
import { listPlayers } from "../api/players.js";
import {
  listTrainingSessions, createTrainingSession, deleteTrainingSession,
  listAttendanceForSession, setAttendance, listPlayerAttendance,
} from "../api/attendance.js";
import { store } from "../store.js";

export default {
  name: "AttendanceView",
  setup() {
    const players = ref([]);
    const sessions = ref([]);
    const activeSessionId = ref(null);
    const attendanceMap = ref({}); // player_id -> present bool
    const newDate = ref(new Date().toISOString().slice(0, 10));
    const summary = ref([]);

    async function load() {
      players.value = await listPlayers({ activeOnly: true });
      sessions.value = await listTrainingSessions(store.currentSeasonId);
      if (store.currentSeasonId) summary.value = await listPlayerAttendance(store.currentSeasonId);
    }

    async function addSession() {
      const s = await createTrainingSession({ session_date: newDate.value, season_id: store.currentSeasonId });
      sessions.value.unshift(s);
      openSession(s.id);
    }

    async function removeSession(id) {
      if (!confirm("Delete this training session and its attendance?")) return;
      await deleteTrainingSession(id);
      sessions.value = sessions.value.filter((s) => s.id !== id);
      if (activeSessionId.value === id) activeSessionId.value = null;
      await load();
    }

    async function openSession(id) {
      activeSessionId.value = id;
      const rows = await listAttendanceForSession(id);
      const map = {};
      for (const p of players.value) map[p.id] = false;
      for (const r of rows) map[r.player_id] = r.present;
      attendanceMap.value = map;
    }

    async function toggle(pid) {
      attendanceMap.value[pid] = !attendanceMap.value[pid];
      await setAttendance(activeSessionId.value, pid, attendanceMap.value[pid]);
    }

    function pct(pid) {
      const row = summary.value.find((s) => s.player_id === pid);
      return row ? row.attendance_pct + "%" : "-";
    }

    onMounted(load);
    return { players, sessions, activeSessionId, attendanceMap, newDate, addSession, removeSession, openSession, toggle, pct };
  },
  template: `
    <main class="container">
      <h2>Training attendance</h2>
      <div style="display:flex; gap:0.5rem; align-items:center;">
        <input v-model="newDate" type="date" />
        <button style="width:auto;" @click="addSession">+ New session</button>
      </div>

      <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin:0.75rem 0;">
        <button v-for="s in sessions" :key="s.id" class="outline" style="width:auto;"
                :class="{ secondary: activeSessionId !== s.id }" @click="openSession(s.id)">
          {{ s.session_date }}
        </button>
      </div>

      <div v-if="activeSessionId">
        <div v-for="p in players" :key="p.id" class="player-row">
          <label style="display:flex; align-items:center; gap:0.5rem; flex:1;">
            <input type="checkbox" :checked="attendanceMap[p.id]" @change="toggle(p.id)" />
            {{ p.first_name }} {{ p.last_name }}
          </label>
          <span class="tag">Season: {{ pct(p.id) }}</span>
        </div>
        <button class="secondary outline" style="width:auto;" @click="removeSession(activeSessionId)">Delete this session</button>
      </div>
      <p v-else>Select or create a session to take attendance.</p>
    </main>
  `,
};
