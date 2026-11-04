import { PLATINUM_LAYOUT1 } from './masteryTargets.js';
import { LAYOUT, HUB_LAYOUT } from './trialLayouts.js';
export { LAYOUT, HUB_LAYOUT };

// Time trial numbers shared by the save, the score queue and the hub board.
// The hub server applies the same floor and ceiling (metaverse-hub CONTRACT C13).
// NOBU may be stricter here, never looser.

/** Hub board for trial times. One board, variant = level ("1" | "2" | "3"), integer ms, lower is better. */
export const TRIAL_BOARD = 'nobu_trial_time';
// Public variants stay gated until the owner-deployed Hub supports them (H70).
export const TRIAL_LEVELS = Object.freeze([1, 2, 3]);
// Shipped stages can keep local trial records before their public boards exist.
export const LOCAL_TRIAL_LEVELS = Object.freeze([1, 2, 3, 4]);

/** Fastest time the hub accepts per level, in ms. Below this the server answers implausible_score. */
export const TRIAL_FLOOR_MS = Object.freeze({ 1: 15000, 2: 15000, 3: 12000, '1v2': 25700, '2v2': 26000, '3v2': 20600, 4: 24000 });
/** Slowest time the hub accepts, in ms (30 min). */
export const TRIAL_CEIL_MS = 1_800_000;

/** Time trial targets per level, in seconds: [gold, silver, bronze] dog tags. */
export const TRIAL_TARGETS = Object.freeze({ 1: [55, 70, 92, PLATINUM_LAYOUT1[1]], 2: [52, 66, 90, PLATINUM_LAYOUT1[2]], 3: [45, 58, 78, PLATINUM_LAYOUT1[3]],
  '1v2': [94, 120, 158, 86], '2v2': [90, 114, 156, 82], '3v2': [77, 100, 134, 70], 4: [98, 125, 160, 90] });

export const trialLayout = (level) => LAYOUT[Number(level)] ?? 1;
export const trialVariant = (level, layout = trialLayout(level)) => layout === 1 ? String(level) : `${level}v${layout}`;
export function trialVariantInfo(variant) {
  const match = /^([1-6])(?:v(2))?$/.exec(String(variant));
  const valid = match && LOCAL_TRIAL_LEVELS.includes(Number(match[1])) && (!match[2] || Number(match[1]) <= 3);
  return valid ? { level: Number(match[1]), layout: Number(match[2] || 1), variant: String(variant) } : null;
}
export function canUploadTrial(variant) {
  const info = trialVariantInfo(variant);
  return !!info && TRIAL_LEVELS.includes(info.level) && info.layout <= (HUB_LAYOUT[info.level] ?? 1) && info.layout === trialLayout(info.level);
}

export function trialMedal(level, t) {
  const g = TRIAL_TARGETS[level];
  if (!g) return null;
  const ms = Math.round(t * 1000), target = g.map((seconds) => Math.round(seconds * 1000));
  return g[3] != null && ms <= target[3] ? 'platinum' : ms <= target[0] ? 'gold' : ms <= target[1] ? 'silver' : ms <= target[2] ? 'bronze' : null;
}

export const fmtTime = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, '0')}`;

export function isTrialLevel(level) {
  return TRIAL_LEVELS.includes(Number(level));
}

/** True when `ms` is an integer the hub board would accept for `level`. */
export function trialMsInBounds(level, ms) {
  const floor = TRIAL_FLOOR_MS[String(level)];
  return floor != null && Number.isInteger(ms) && ms >= floor && ms <= TRIAL_CEIL_MS;
}
