import { ref, reactive, computed, onMounted } from "vue";
import { getFixture, updateFixture } from "../api/fixtures.js";
import { listAppearancesForFixture, upsertAppearance } from "../api/appearances.js";

// Quick, thumb-friendly score/scorer/assist/POTM entry for use pitch-side on
// a phone, mid-match. Deliberately narrow scope - minutes, ratings etc. stay
// on the Match Stats page for a calmer post-match pass.
export default {
  name: "LiveMatchView",
  props: { id: String },
  setup(props) {
    const fixture = ref(null);
    const rows = reactive({});   // player_id -> appearance row (editable copy)
    const order = ref([]);       // player_id order for display
    const saving = ref(false);
    const savedAt = ref("");

    const step = ref(null);          // null | 'scorer' | 'assist'
    const pendingScorerPid = ref(null);
    const lastGoal = ref(null);      // { side: 'us'|'them', scorerPid, assistPid } - single-level undo

    function playerName(pid) {
      const r = rows[pid];
      return `${r.players?.first_name ?? ""} ${r.players?.last_name ?? ""}`.trim();
    }

    function squadNum(pid) {
      const r = rows[pid];
      return r.players?.squad_number ?? r.shirt_number ?? "-";
    }

    async function load() {
      fixture.value = await getFixture(props.id);
      const apps = (await listAppearancesForFixture(props.id)).filter((a) => a.selected);
      for (const a of apps) rows[a.player_id] = { ...a };
      order.value = apps.map((a) => a.player_id).sort((a, b) => playerName(a).localeCompare(playerName(b)));
    }

    async function saveRow(pid) {
      const r = rows[pid];
      saving.value = true;
      try {
        await upsertAppearance({
          fixture_id: props.id,
          player_id: pid,
          selected: true,
          starting: r.starting,
          shirt_number: r.shirt_number,
          position: r.position,
          minutes_played: r.minutes_played,
          minutes_in_goal: r.minutes_in_goal,
          goals: r.goals,
          assists: r.assists,
          rating: r.rating,
          potm: !!r.potm,
        });
        savedAt.value = new Date().toLocaleTimeString();
      } finally {
        saving.value = false;
      }
    }

    async function saveFixture(patch) {
      fixture.value = { ...fixture.value, ...patch };
      saving.value = true;
      try {
        await updateFixture(props.id, patch);
        savedAt.value = new Date().toLocaleTimeString();
      } finally {
        saving.value = false;
      }
    }

    // A goal (ours or theirs) implicitly means the match is under way.
    function playedPatch(extra) {
      return fixture.value.status === "scheduled" ? { ...extra, status: "played" } : extra;
    }

    function startGoal() { step.value = "scorer"; }
    function cancelGoal() { step.value = null; pendingScorerPid.value = null; }
    function pickScorer(pid) { pendingScorerPid.value = pid; step.value = "assist"; }

    async function finishGoal(assistPid) {
      const scorerPid = pendingScorerPid.value;
      rows[scorerPid].goals = (rows[scorerPid].goals || 0) + 1;
      if (assistPid) rows[assistPid].assists = (rows[assistPid].assists || 0) + 1;
      await Promise.all([
        saveRow(scorerPid),
        assistPid ? saveRow(assistPid) : Promise.resolve(),
        saveFixture(playedPatch({ our_score: (fixture.value.our_score || 0) + 1 })),
      ]);
      lastGoal.value = { side: "us", scorerPid, assistPid };
      step.value = null;
      pendingScorerPid.value = null;
    }

    async function addOppositionGoal() {
      await saveFixture(playedPatch({ their_score: (fixture.value.their_score || 0) + 1 }));
      lastGoal.value = { side: "them" };
    }

    async function undoLastGoal() {
      const g = lastGoal.value;
      if (!g) return;
      if (g.side === "us") {
        rows[g.scorerPid].goals = Math.max(0, (rows[g.scorerPid].goals || 0) - 1);
        if (g.assistPid) rows[g.assistPid].assists = Math.max(0, (rows[g.assistPid].assists || 0) - 1);
        await Promise.all([
          saveRow(g.scorerPid),
          g.assistPid ? saveRow(g.assistPid) : Promise.resolve(),
          saveFixture({ our_score: Math.max(0, (fixture.value.our_score || 0) - 1) }),
        ]);
      } else {
        await saveFixture({ their_score: Math.max(0, (fixture.value.their_score || 0) - 1) });
      }
      lastGoal.value = null;
    }

    const lastGoalLabel = computed(() => {
      const g = lastGoal.value;
      if (!g) return "";
      if (g.side === "them") return `Goal for ${fixture.value.opponent}`;
      let label = `Goal: ${playerName(g.scorerPid)}`;
      if (g.assistPid) label += ` (assist ${playerName(g.assistPid)})`;
      return label;
    });

    async function setPotm(pid) {
      const toClear = order.value.filter((other) => other !== pid && rows[other].potm);
      rows[pid].potm = true;
      await Promise.all([...toClear.map((other) => { rows[other].potm = false; return saveRow(other); }), saveRow(pid)]);
    }

    async function markFullTime() { await saveFixture({ status: "played" }); }

    const scorers = computed(() => order.value.filter((pid) => rows[pid].goals > 0));

    onMounted(load);
    return {
      fixture, rows, order, saving, savedAt, playerName, squadNum,
      step, pendingScorerPid, lastGoal, lastGoalLabel, scorers,
      startGoal, cancelGoal, pickScorer, finishGoal, addOppositionGoal, undoLastGoal,
      setPotm, markFullTime,
    };
  },
  template: `
    <main class="container" v-if="fixture">
      <header style="text-align:center;">
        <h2 style="margin:0.25rem 0;">vs {{ fixture.opponent }} <span class="tag">{{ fixture.home_away }}</span></h2>
        <p style="opacity:0.7; margin:0;">{{ fixture.match_date }} <span v-if="fixture.kickoff">&middot; {{ fixture.kickoff }}</span></p>
      </header>

      <div class="live-score">
        <div class="live-score-side">
          <span class="live-score-label">Us</span>
          <div class="live-score-value">{{ fixture.our_score ?? 0 }}</div>
          <button class="live-goal-btn" @click="startGoal" :disabled="!order.length">+ GOAL</button>
        </div>
        <div class="live-score-side">
          <span class="live-score-label">{{ fixture.opponent }}</span>
          <div class="live-score-value">{{ fixture.their_score ?? 0 }}</div>
          <button class="live-goal-btn secondary" @click="addOppositionGoal">+ GOAL</button>
        </div>
      </div>

      <p style="text-align:center; font-size:0.85rem;">
        <span v-if="lastGoal">{{ lastGoalLabel }} &middot; <a href="#" @click.prevent="undoLastGoal">Undo</a></span>
        <span v-else style="opacity:0.6;">No goals logged yet</span>
      </p>
      <p style="text-align:center; font-size:0.8rem; opacity:0.6;">
        <span v-if="saving">Saving...</span><span v-else-if="savedAt">Saved {{ savedAt }}</span>
      </p>

      <article v-if="step === 'scorer'">
        <h3 style="margin-top:0;">Who scored?</h3>
        <div class="live-player-grid">
          <button v-for="pid in order" :key="pid" type="button" class="live-player-btn" @click="pickScorer(pid)">
            <span class="num">{{ squadNum(pid) }}</span> {{ playerName(pid) }}
          </button>
        </div>
        <button type="button" class="secondary" style="width:auto;" @click="cancelGoal">Cancel</button>
      </article>

      <article v-if="step === 'assist'">
        <h3 style="margin-top:0;">Assist by?</h3>
        <div class="live-player-grid">
          <button type="button" class="live-player-btn outline" @click="finishGoal(null)">No assist</button>
          <button v-for="pid in order.filter(p => p !== pendingScorerPid)" :key="pid" type="button" class="live-player-btn" @click="finishGoal(pid)">
            <span class="num">{{ squadNum(pid) }}</span> {{ playerName(pid) }}
          </button>
        </div>
      </article>

      <h3>Player of the Match</h3>
      <div class="live-player-grid">
        <button v-for="pid in order" :key="pid" type="button" class="live-player-btn" :class="{ active: rows[pid].potm }" @click="setPotm(pid)">
          <span class="num">{{ squadNum(pid) }}</span> {{ playerName(pid) }}<span v-if="rows[pid].potm">&nbsp;&#9733;</span>
        </button>
      </div>
      <p v-if="!order.length" style="opacity:0.7;">No players selected for this fixture yet - pick a team first.</p>

      <div v-if="scorers.length">
        <h3>Goals so far</h3>
        <ul>
          <li v-for="pid in scorers" :key="pid">
            {{ playerName(pid) }} &mdash; {{ rows[pid].goals }} goal{{ rows[pid].goals === 1 ? '' : 's' }}<span v-if="rows[pid].assists"> &middot; {{ rows[pid].assists }} assist{{ rows[pid].assists === 1 ? '' : 's' }}</span>
          </li>
        </ul>
      </div>

      <div style="display:flex; gap:0.5rem; flex-wrap:wrap; margin-top:1rem;">
        <button v-if="fixture.status !== 'played'" type="button" class="outline" style="width:auto;" @click="markFullTime">Full time - mark as played</button>
        <router-link to="/fixtures"><button type="button" class="secondary" style="width:auto;">Back to fixtures</button></router-link>
      </div>
    </main>
  `,
};
