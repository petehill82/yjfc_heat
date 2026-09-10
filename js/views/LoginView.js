import { ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { signIn, sendPasswordReset } from "../supabase.js";
import { refreshAuth } from "../store.js";

export default {
  name: "LoginView",
  setup() {
    const route = useRoute();
    const router = useRouter();
    const email = ref("");
    const password = ref("");
    const error = ref("");
    const info = ref("");
    const busy = ref(false);

    async function submit() {
      error.value = ""; info.value = ""; busy.value = true;
      const { error: err } = await signIn(email.value.trim(), password.value);
      busy.value = false;
      if (err) { error.value = err.message; return; }
      await refreshAuth();
      router.replace(route.query.redirect || "/");
    }

    async function forgotPassword() {
      if (!email.value.trim()) { error.value = "Enter your email above first."; return; }
      error.value = "";
      const { error: err } = await sendPasswordReset(email.value.trim(), location.origin + location.pathname);
      info.value = err ? "" : "Password reset email sent - check your inbox.";
      if (err) error.value = err.message;
    }

    return { email, password, error, info, busy, submit, forgotPassword };
  },
  template: `
    <main class="container" style="max-width:420px; margin-top:3rem;">
      <article>
        <header style="text-align:center;">
          <img src="assets/badge.svg" alt="Club badge" style="height:4rem;" />
          <h2>Coach sign in</h2>
        </header>
        <form @submit.prevent="submit">
          <label>Email
            <input type="email" v-model="email" required autocomplete="username" />
          </label>
          <label>Password
            <input type="password" v-model="password" required autocomplete="current-password" />
          </label>
          <p v-if="error" style="color:#b91c1c;">{{ error }}</p>
          <p v-if="info" style="color:#166534;">{{ info }}</p>
          <button type="submit" :aria-busy="busy" :disabled="busy">Sign in</button>
        </form>
        <p style="text-align:center;">
          <a href="#" @click.prevent="forgotPassword">Forgot password?</a>
        </p>
        <p style="text-align:center; font-size:0.8rem; opacity:0.7;">
          New coach? Ask the admin to invite your email from the Supabase dashboard.
        </p>
      </article>
    </main>
  `,
};
