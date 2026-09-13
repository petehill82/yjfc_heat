import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../supabase.js";

// Reached after clicking an invite or password-reset email link (which signs
// the coach in via a one-time token but sets no password), or any time a
// signed-in coach wants to change their password.
export default {
  name: "SetPasswordView",
  setup() {
    const router = useRouter();
    const password = ref("");
    const confirmPassword = ref("");
    const error = ref("");
    const busy = ref(false);

    async function submit() {
      error.value = "";
      if (password.value.length < 8) { error.value = "Password must be at least 8 characters."; return; }
      if (password.value !== confirmPassword.value) { error.value = "Passwords don't match."; return; }
      busy.value = true;
      const { error: err } = await supabase.auth.updateUser({ password: password.value });
      busy.value = false;
      if (err) { error.value = err.message; return; }
      router.replace("/");
    }

    return { password, confirmPassword, error, busy, submit };
  },
  template: `
    <main class="container" style="max-width:420px; margin-top:3rem;">
      <article>
        <header style="text-align:center;">
          <img src="assets/badge.svg" alt="Club badge" style="height:4rem;" />
          <h2>Set your password</h2>
        </header>
        <p style="text-align:center; opacity:0.75; font-size:0.9rem;">
          Choose a password so you can sign in directly next time.
        </p>
        <form @submit.prevent="submit">
          <label>New password
            <input type="password" v-model="password" required minlength="8" autocomplete="new-password" />
          </label>
          <label>Confirm password
            <input type="password" v-model="confirmPassword" required minlength="8" autocomplete="new-password" />
          </label>
          <p v-if="error" style="color:#b91c1c;">{{ error }}</p>
          <button type="submit" :aria-busy="busy" :disabled="busy">Save password</button>
        </form>
      </article>
    </main>
  `,
};
