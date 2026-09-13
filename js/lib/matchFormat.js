// Match format now lives per-season (seasons.game_minutes / players_on_pitch,
// editable from Admin) since it changes across age groups/seasons. These are
// just the defaults for a brand-new season, and a fallback if a fixture's
// season can't be found for some reason.
export const DEFAULT_GAME_MINUTES = 50;
export const DEFAULT_PLAYERS_ON_PITCH = 7;
