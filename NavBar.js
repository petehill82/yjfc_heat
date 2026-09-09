import { useRouter } from "vue-router";
import { store, isAdmin } from "../store.js";
import { signOut } from "../supabase.js";

export default {
  name: "NavBar",
  setup() {
    const router = useRouter();
    async function logout() {
      await signOut();
      router.push("/login");
    }
    return { store, isAdmin, logout };
  },
  template: `
    <header class="app-header">
      <img class="badge" :src="store.clubSettings.badge_path || 'assets/badge.svg'" alt="Club badge" />
      <div style="flex:1">
        <p class="club-title">
          {{ store.clubSettings.club_name || 'Squad Manager' }}
          <small v-if="store.seasons.length">{{ store.seasons.find(s => s.id === store.currentSeasonId)?.squad_name }}</small>
        </p>
      </div>
      <nav class="top-nav">
        <router-link to="/">Dashboard</router-link>
        <router-link to="/players">Players</router-link>
        <router-link to="/fixtures">Fixtures</router-link>
        <router-link to="/availability">Availability</router-link>
        <router-link to="/attendance">Attendance</router-link>
        <router-link v-if="isAdmin()" to="/admin">Admin</router-link>
        <a href="#" @click.prevent="logout" class="no-print">Sign out</a>
      </nav>
    </header>
    <nav class="bottom-nav no-print">
      <router-link to="/">🏠<br>Home</router-link>
      <router-link to="/players">👥<br>Players</router-link>
      <router-link to="/fixtures">📅<br>Fixtures</router-link>
      <router-link to="/availability">✅<br>Avail.</router-link>
      <router-link v-if="isAdmin()" to="/admin">⚙️<br>Admin</router-link>
      <a href="#" @click.prevent="logout">🚪<br>Sign out</a>
    </nav>
  `,
};
