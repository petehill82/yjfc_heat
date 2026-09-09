import { ref, computed, onMounted } from "vue";
import { listPlayers, createPlayer, setPlayerActive } from "../api/players.js";
import { isAdmin } from "../store.js";

export default {
  name: "PlayersView",
  setup() {
    const players = ref([]);
    const search = ref("");
    const showArchived = ref(false);
    const showAdd = ref(false);
    const newPlayer = ref({ first_name: "", last_name: "", squad_number: null, year_of_birth: null, preferred_positions: "" });
    const error = ref("");

    async function load() {
      players.value = await listPlayers({ activeOnly: !showArchived.value });
    }

    const filtered = computed(() => {
      const q = search.value.trim().toLowerCase();
      if (!q) return players.value;
      return players.value.filter((p) =>
        `${p.first_name} ${p.last_name} ${p.squad_number ?? ""}`.toLowerCase().includes(q)
      );
    });

    async function addPlayer() {
      error.value = "";
      try {
        const payload = {
          ...newPlayer.value,
          squad_number: newPlayer.value.squad_number ? Number(newPlayer.value.squad_number) : null,
          year_of_birth: newPlayer.value.year_of_birth ? Number(newPlayer.value.year_of_birth) : null,
          preferred_positions: newPlayer.value.preferred_positions
            ? newPlayer.value.preferred_positions.split(",").map((s) => s.trim()).filter(Boolean)
            : [],
        };
        await createPlayer(payload);
        newPlayer.value = { first_name: "", last_name: "", squad_number: null, year_of_birth: null, preferred_positions: "" };
        showAdd.value = false;
        await load();
      } catch (e) {
        error.value = e.message;
      }
    }

    async function toggleArchive(p) {
      await setPlayerActive(p.id, !p.active);
      await load();
    }

    onMounted(load);
    return { players, filtered, search, showArchived, showAdd, newPlayer, error, isAdmin, addPlayer, toggleArchive, load };
  },
  template: `
    <main class="container">
      <h2>Squad</h2>
      <div style="display:flex; gap:0.5rem; flex-wrap:wrap; align-items:center;">
        <input v-model="search" placeholder="Search name or number" style="flex:1; min-width:180px;" />
        <label style="display:flex; align-items:center; gap:0.3rem; white-space:nowrap;">
          <input type="checkbox" v-model="showArchived" @change="load" /> Show archived
        </label>
        <button v-if="isAdmin()" @click="showAdd = !showAdd">{{ showAdd ? 'Cancel' : '+ Add player' }}</button>
      </div>

      <article v-if="showAdd">
        <form @submit.prevent="addPlayer">
          <div class="stat-grid">
            <input v-model="newPlayer.first_name" placeholder="First name" required />
            <input v-model="newPlayer.last_name" placeholder="Last name" required />
            <input v-model="newPlayer.squad_number" type="number" placeholder="Squad no." />
            <input v-model="newPlayer.year_of_birth" type="number" placeholder="Year of birth" />
            <input v-model="newPlayer.preferred_positions" placeholder="Positions (comma sep.)" />
          </div>
          <p v-if="error" style="color:#b91c1c;">{{ error }}</p>
          <button type="submit">Save player</button>
        </form>
      </article>

      <div v-for="p in filtered" :key="p.id" class="player-row">
        <span class="num">{{ p.squad_number ?? '-' }}</span>
        <router-link :to="'/players/' + p.id" style="flex:1;">
          {{ p.first_name }} {{ p.last_name }}
          <span v-if="!p.active" class="tag warn">Archived</span>
        </router-link>
        <span style="font-size:0.8rem; opacity:0.7;">{{ (p.preferred_positions || []).join(', ') }}</span>
        <button v-if="isAdmin()" class="secondary outline" style="width:auto;" @click="toggleArchive(p)">
          {{ p.active ? 'Archive' : 'Restore' }}
        </button>
      </div>
      <p v-if="!filtered.length">No players found.</p>
    </main>
  `,
};
