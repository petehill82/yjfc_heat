import { createApp } from "vue";
import { createRouter, createWebHashHistory } from "vue-router";

import { store, refreshAuth } from "./store.js";
import NavBar from "./components/NavBar.js";

import LoginView from "./views/LoginView.js";
import SetPasswordView from "./views/SetPasswordView.js";
import DashboardView from "./views/DashboardView.js";
import TodayView from "./views/TodayView.js";
import PlayersView from "./views/PlayersView.js";
import PlayerDetailView from "./views/PlayerDetailView.js";
import FixturesView from "./views/FixturesView.js";
import ResultsView from "./views/ResultsView.js";
import MatchdayView from "./views/MatchdayView.js";
import TeamSheetView from "./views/TeamSheetView.js";
import DayTeamSheetView from "./views/DayTeamSheetView.js";
import MatchStatsView from "./views/MatchStatsView.js";
import LiveMatchView from "./views/LiveMatchView.js";
import AvailabilityView from "./views/AvailabilityView.js";
// Not in use for now - see NavBar.js for the matching nav-link comment-out.
// import AttendanceView from "./views/AttendanceView.js";
import AdminView from "./views/AdminView.js";

// Supabase invite/reset emails land here as a URL hash fragment
// (#access_token=...&type=invite|recovery), which signs the coach in via a
// one-time token but sets no password. This app also uses hash-based
// routing, so that fragment would otherwise just look like an unmatched
// route. Read it here, synchronously, before the router's first navigation
// (and before Supabase's own async hash processing clears it) so we know to
// send the coach to the set-password page once their session is ready.
let pendingAuthRedirect = /access_token=/.test(location.hash)
  && ["invite", "recovery"].includes(new URLSearchParams(location.hash.slice(1)).get("type"))
  ? "set-password"
  : null;

const routes = [
  { path: "/login", name: "login", component: LoginView, meta: { public: true } },
  { path: "/set-password", name: "set-password", component: SetPasswordView },
  { path: "/", name: "dashboard", component: DashboardView },
  { path: "/today", name: "today", component: TodayView },
  { path: "/players", name: "players", component: PlayersView },
  { path: "/players/:id", name: "player-detail", component: PlayerDetailView, props: true },
  { path: "/fixtures", name: "fixtures", component: FixturesView },
  { path: "/results", name: "results", component: ResultsView },
  { path: "/matchday/:date", name: "matchday", component: MatchdayView, props: true },
  { path: "/team-sheet/:id", name: "team-sheet", component: TeamSheetView, props: true },
  { path: "/team-sheet-day/:date", name: "team-sheet-day", component: DayTeamSheetView, props: true },
  { path: "/match-stats/:id", name: "match-stats", component: MatchStatsView, props: true },
  { path: "/live/:id", name: "live-match", component: LiveMatchView, props: true },
  { path: "/availability", name: "availability", component: AvailabilityView },
  // { path: "/attendance", name: "attendance", component: AttendanceView },
  { path: "/admin", name: "admin", component: AdminView, meta: { adminOnly: true } },
  // Catch-all for anything unmatched (e.g. the raw invite/reset hash itself,
  // once consumed below) rather than silently rendering a blank page.
  { path: "/:pathMatch(.*)*", redirect: "/" },
];

const router = createRouter({ history: createWebHashHistory(), routes });

router.beforeEach(async (to) => {
  if (!store.ready) await refreshAuth();
  if (pendingAuthRedirect && to.name !== pendingAuthRedirect) {
    const target = pendingAuthRedirect;
    pendingAuthRedirect = null;
    return { name: target };
  }
  if (!to.meta.public && !store.user) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
  if (to.meta.adminOnly && store.profile?.role !== "admin") {
    return { name: "dashboard" };
  }
  if (to.name === "login" && store.user) {
    return { name: "dashboard" };
  }
  return true;
});

const RootLayout = {
  components: { NavBar },
  computed: { showNav() { return store.ready && store.user && !["login", "set-password"].includes(this.$route.name); } },
  template: `
    <NavBar v-if="showNav" />
    <router-view />
  `,
};

const app = createApp(RootLayout);
app.use(router);

// Wait for the initial auth check before mounting, so the first render
// (and the router guard's first navigation) sees the real signed-in state.
refreshAuth().then(() => app.mount("#app"));
