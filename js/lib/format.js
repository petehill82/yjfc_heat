// Postgres returns "time" columns as "HH:MM:SS" - trim to "HH:MM" for display.
export function formatTime(t) {
  return t ? t.slice(0, 5) : "";
}
