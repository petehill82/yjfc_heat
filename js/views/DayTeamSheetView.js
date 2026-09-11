import { ref, computed, onMounted } from "vue";
import { listFixturesOnDate } from "../api/fixtures.js";
import { listAppearancesForFixture } from "../api/appearances.js";
import { listPlayers } from "../api/players.js";
import { store } from "../store.js";

export default {
  name: "DayTeamSheetView",
  props: { date: String },
  setup(props) {
    const fixtures = ref([]);
    const players = ref([]);
    const squadByFixture = ref({}); // fixture_id -> [{ id, name }]
    const shareStatus = ref("");

    async function load() {
      fixtures.value = await listFixturesOnDate(props.date);
      players.value = await listPlayers({ activeOnly: true });
      const byFixture = {};
      for (const f of fixtures.value) {
        const apps = await listAppearancesForFixture(f.id);
        byFixture[f.id] = apps
          .filter((a) => a.selected)
          .map((a) => ({ id: a.player_id, name: `${a.players?.first_name ?? ""} ${a.players?.last_name ?? ""}`.trim() }))
          .sort((a, b) => a.name.localeCompare(b.name));
      }
      squadByFixture.value = byFixture;
    }

    // Active-roster players not selected for any fixture today - the
    // "did I miss anyone" check. Coach-only: deliberately left out of
    // asText() below, since that feeds the printed sheet and the Share
    // button (WhatsApp/email to parents).
    const unselectedPlayers = computed(() => {
      const selectedIds = new Set(Object.values(squadByFixture.value).flat().map((p) => p.id));
      return players.value.filter((p) => !selectedIds.has(p.id));
    });

    const clubName = computed(() => store.clubSettings.club_name);

    function asText() {
      const lines = [`${clubName.value} - Matchday ${props.date}`, ""];
      for (const f of fixtures.value) {
        const squad = squadByFixture.value[f.id] || [];
        lines.push(`${f.team_name || 'Team'} vs ${f.opponent} (${f.home_away === 'home' ? 'Home' : 'Away'}) - ${squad.length} selected`);
        lines.push(`${f.kickoff || ''}${f.venue ? ' @ ' + f.venue : ''}`.trim());
        if (f.coaches?.length) lines.push(`Coaches: ${f.coaches.join(', ')}`);
        lines.push(...squad.map((p) => p.name));
        lines.push("");
      }
      return lines.join("\n");
    }

    async function share() {
      const text = asText();
      if (navigator.share) {
        try { await navigator.share({ title: "Team sheets", text }); return; } catch { /* user cancelled */ }
      }
      await navigator.clipboard.writeText(text);
      shareStatus.value = "Copied to clipboard - paste into WhatsApp/email.";
      setTimeout(() => (shareStatus.value = ""), 4000);
    }

    function printSheet() { window.print(); }

    onMounted(load);
    return { fixtures, squadByFixture, unselectedPlayers, clubName, share, printSheet, shareStatus };
  },
  template: `
    <main class="container team-sheet">
      <div class="club-header-band no-print" style="padding:0.75rem 1rem; margin-bottom:1rem;">
        <strong>{{ clubName }}</strong> matchday team sheets
      </div>
      <header style="display:flex; align-items:center; gap:0.75rem;">
        <img src="assets/badge.svg" style="height:3rem;" alt="badge" />
        <h3 style="margin:0;">{{ clubName }} &middot; {{ date }}</h3>
      </header>

      <div class="matchday-columns">
        <article v-for="f in fixtures" :key="f.id" class="day-sheet-match" :class="{ pitch: f.status === 'played' }">
          <header>
            <strong>{{ f.team_name || 'Team' }}</strong> vs {{ f.opponent }}
            <span class="tag">{{ f.home_away === 'home' ? 'Home' : 'Away' }}</span>
            <span class="tag">{{ (squadByFixture[f.id] || []).length }} selected</span>
          </header>
          <p style="font-size:0.85rem; opacity:0.75;">
            <span v-if="f.kickoff">{{ f.kickoff }} &middot; </span>{{ f.venue }}
          </p>
          <p v-if="(f.coaches || []).length" style="font-size:0.85rem; opacity:0.75;">Coaches: {{ f.coaches.join(', ') }}</p>
          <ul>
            <li v-for="p in (squadByFixture[f.id] || [])" :key="p.id">{{ p.name }}</li>
          </ul>
          <p v-if="!(squadByFixture[f.id] || []).length" style="font-size:0.85rem; opacity:0.7;">No squad selected yet.</p>
        </article>
      </div>
      <p v-if="!fixtures.length">No fixtures scheduled on this date.</p>

      <article v-if="unselectedPlayers.length" class="no-print" style="border-top-color: var(--status-warn); margin-top:1rem;">
        <strong>{{ unselectedPlayers.length }} not selected for any fixture today</strong>
        <p style="margin:0.35rem 0 0;">{{ unselectedPlayers.map(p => p.first_name + ' ' + p.last_name).join(', ') }}</p>
      </article>

      <div class="no-print" style="display:flex; gap:0.5rem; margin-top:1rem;">
        <button @click="printSheet">Print / Save as PDF</button>
        <button class="secondary" @click="share">Share</button>
      </div>
      <p v-if="shareStatus" class="no-print">{{ shareStatus }}</p>
    </main>
  `,
};
