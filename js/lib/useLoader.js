import { ref } from "vue";

// Wraps an async load function so a transient failure (flaky network, a
// momentary Supabase blip) shows a visible "didn't load - Retry" message
// instead of silently leaving the page half (or entirely) empty with no
// explanation - which otherwise looks like the app just "does nothing" and
// needs an unexplained manual refresh to recover.
export function useLoader(fn) {
  const error = ref("");
  const loading = ref(false);

  async function run(...args) {
    error.value = "";
    loading.value = true;
    try {
      await fn(...args);
    } catch (e) {
      console.error("Load failed:", e);
      error.value = "Couldn't load - tap Retry.";
    } finally {
      loading.value = false;
    }
  }

  return { error, loading, run };
}
