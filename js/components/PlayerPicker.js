// One row per squad player for a single fixture: selection, starting XI,
// shirt number, position - plus availability / double-booking hints.
export default {
  name: "PlayerPicker",
  props: {
    players: { type: Array, required: true },       // full active roster
    rows: { type: Object, required: true },          // player_id -> appearance row (reactive)
    availability: { type: Object, default: () => ({}) }, // player_id -> 'available'|'unavailable'|'unknown'
    duplicateIds: { type: Object, default: () => new Set() }, // player_ids selected on another fixture same day
  },
  emits: ["change"],
  methods: {
    row(p) {
      return this.rows[p.id] || { selected: false, starting: false, shirt_number: null, position: "", minutes_played: 0 };
    },
    update(p, patch) {
      this.$emit("change", p.id, patch);
    },
    availTag(p) {
      const s = this.availability[p.id];
      if (s === "unavailable") return { text: "Unavailable", cls: "warn" };
      if (s === "available") return { text: "Available", cls: "ok" };
      return null;
    },
  },
  template: `
    <div>
      <div v-for="p in players" :key="p.id" class="player-row">
        <label style="display:flex; align-items:center; gap:0.5rem; flex:1;">
          <input type="checkbox" :checked="row(p).selected"
                 @change="update(p, { selected: $event.target.checked })" />
          <span class="num">{{ p.squad_number ?? '-' }}</span>
          <span>{{ p.first_name }} {{ p.last_name }}</span>
          <span v-if="duplicateIds.has(p.id)" class="tag warn">Also picked today</span>
          <span v-if="availTag(p)" :class="['tag', availTag(p).cls]">{{ availTag(p).text }}</span>
        </label>
        <template v-if="row(p).selected">
          <label style="display:flex; align-items:center; gap:0.25rem;">
            <input type="checkbox" :checked="row(p).starting"
                   @change="update(p, { starting: $event.target.checked })" /> Start
          </label>
          <input class="no-print" style="width:4.5rem;" placeholder="Pos" :value="row(p).position"
                 @change="update(p, { position: $event.target.value })" />
          <input class="no-print" style="width:3.5rem;" type="number" placeholder="No." :value="row(p).shirt_number"
                 @change="update(p, { shirt_number: $event.target.value ? Number($event.target.value) : null })" />
        </template>
      </div>
    </div>
  `,
};
