import { playerDisplayName } from "../lib/format.js";

// One row per squad player for a single fixture: just tick who's in the
// squad for this match, plus availability / already-playing-elsewhere-today
// hints. No starting/subs split, no positions or shirt numbers - squads only.

// Highest ability first (unrated players sort last), then alphabetically by
// displayed name - used to order the pick-team list. The number itself is
// never shown in the UI, only used for ordering.
function byAbilityThenName(a, b) {
  const abilA = a.ability ?? -1;
  const abilB = b.ability ?? -1;
  if (abilB !== abilA) return abilB - abilA;
  return playerDisplayName(a).toLowerCase().localeCompare(playerDisplayName(b).toLowerCase());
}

export default {
  name: "PlayerPicker",
  props: {
    players: { type: Array, required: true },       // full active roster
    rows: { type: Object, required: true },          // player_id -> appearance row (reactive)
    availability: { type: Object, default: () => ({}) }, // player_id -> 'available'|'unavailable'|'unknown'
    otherMatches: { type: Object, default: () => ({}) }, // player_id -> [other match labels today]
  },
  emits: ["change"],
  data() {
    return { showOthers: false };
  },
  computed: {
    // Available (or unmarked) players lead the list, since squads are built
    // from who's available; unavailable players are tucked away below.
    // Within each group: highest ability first, then alphabetically.
    availablePlayers() {
      return this.players.filter((p) => this.availability[p.id] !== "unavailable").sort(byAbilityThenName);
    },
    unavailablePlayers() {
      return this.players.filter((p) => this.availability[p.id] === "unavailable").sort(byAbilityThenName);
    },
    selectedCount() {
      return this.players.filter((p) => this.row(p).selected).length;
    },
  },
  methods: {
    playerDisplayName,
    row(p) {
      return this.rows[p.id] || { selected: false };
    },
    toggle(p) {
      this.$emit("change", p.id, { selected: !this.row(p).selected });
    },
    availTag(p) {
      const s = this.availability[p.id];
      if (s === "available") return { text: "Available", cls: "ok" };
      if (s === "unavailable") return { text: "Unavailable", cls: "warn" };
      return null;
    },
  },
  template: `
    <div>
      <p style="font-size:0.85rem; opacity:0.75; margin-bottom:0.25rem;">{{ selectedCount }} / {{ players.length }} selected</p>
      <div v-for="p in availablePlayers" :key="p.id" class="player-row">
        <label style="display:flex; align-items:center; gap:0.5rem; flex:1;">
          <input type="checkbox" :checked="row(p).selected" @change="toggle(p)" />
          <span class="num">{{ p.squad_number ?? '-' }}</span>
          <span>{{ playerDisplayName(p) }}</span>
          <span v-if="(otherMatches[p.id] || []).length" class="tag">
            Also playing: {{ otherMatches[p.id].join(', ') }}
          </span>
          <span v-if="availTag(p)" :class="['tag', availTag(p).cls]">{{ availTag(p).text }}</span>
        </label>
      </div>

      <button v-if="unavailablePlayers.length" type="button" class="secondary outline"
              style="width:auto; margin-top:0.5rem;" @click="showOthers = !showOthers">
        {{ showOthers ? 'Hide' : 'Show' }} {{ unavailablePlayers.length }} unavailable
      </button>
      <div v-if="showOthers">
        <div v-for="p in unavailablePlayers" :key="p.id" class="player-row" style="opacity:0.6;">
          <label style="display:flex; align-items:center; gap:0.5rem; flex:1;">
            <input type="checkbox" :checked="row(p).selected" @change="toggle(p)" />
            <span class="num">{{ p.squad_number ?? '-' }}</span>
            <span>{{ playerDisplayName(p) }}</span>
            <span class="tag warn">Unavailable</span>
          </label>
        </div>
      </div>
    </div>
  `,
};
