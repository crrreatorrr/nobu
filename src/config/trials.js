// Time trial numbers shared by the save, the score queue and the hub board.
// The hub server applies the same floor and ceiling (metaverse-hub CONTRACT C13).
// NOBU may be stricter here, never looser.

/** Hub board for trial times. One board, variant = level ("1" | "2" | "3"), integer ms, lower is better. */
export const TRIAL_BOARD = 'nobu_trial_time';
export const TRIAL_LEVELS = Object.freeze([1, 2, 3]);

/** Fastest time the hub accepts per level, in ms. Below this the server answers implausible_score. */
export const TRIAL_FLOOR_MS = Object.freeze({ 1: 15000, 2: 15000, 3: 12000 });
/** Slowest time the hub accepts, in ms (30 min). */
export const TRIAL_CEIL_MS = 1_800_000;

/** Time trial targets per level, in seconds: [gold, silver, bronze] dog tags. */
export const TRIAL_TARGETS = Object.freeze({ 1: [55, 70, 92], 2: [52, 66, 90], 3: [45, 58, 78] });

export function trialMedal(level, t) {
  const g = TRIAL_TARGETS[level];
  if (!g) return null;
  return t <= g[0] ? 'gold' : t <= g[1] ? 'silver' : t <= g[2] ? 'bronze' : null;
}

export const fmtTime = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

export function isTrialLevel(level) {
  return TRIAL_LEVELS.includes(Number(level));
}

/** True when `ms` is an integer the hub board would accept for `level`. */
export function trialMsInBounds(level, ms) {
  const floor = TRIAL_FLOOR_MS[Number(level)];
  return floor != null && Number.isInteger(ms) && ms >= floor && ms <= TRIAL_CEIL_MS;
}
