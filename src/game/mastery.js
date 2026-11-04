import { TRIAL_TARGETS, TRIAL_FLOOR_MS, TRIAL_CEIL_MS } from '../config/trials.js';
import { BOSS_SPEED_MS } from '../bosses/medals.js';

// Rewards12.1 layout1 first-pass targets. Later level tasks own future variants.
export const PLATINUM_LAYOUT1 = Object.freeze({ 1: 50, 2: 47, 3: 41 });
export function masteryTargets(variant, table = TRIAL_TARGETS) {
  const row = table[variant];
  return row ? [row[0], row[1], row[2], row[3] ?? PLATINUM_LAYOUT1[variant]] : null;
}
const validMs = (variant, ms) => Number.isInteger(ms) && ms >= TRIAL_FLOOR_MS[variant] && ms <= TRIAL_CEIL_MS;
const minMs = (a, b) => a == null ? b : b == null ? a : Math.min(a, b);
export const platinumEligible = (ctx = {}) => !(ctx.god || ctx.godUsed || ctx.remix || ctx.rush || ctx.dda || ctx.ddaUsed);
export function masteryTrialMedal(variant, seconds, ctx = {}, table = TRIAL_TARGETS) {
  const targets = masteryTargets(variant, table);
  if (!targets || !Number.isFinite(seconds) || !validMs(variant, Math.round(seconds * 1000))) return null;
  const [gold, silver, bronze, platinum] = targets;
  return platinum != null && seconds <= platinum && platinumEligible(ctx) ? 'platinum'
    : seconds <= gold ? 'gold' : seconds <= silver ? 'silver' : seconds <= bronze ? 'bronze' : null;
}

// God-used belongs to the fastest record, not the tab's current toggle. A slower
// clean run can still earn its own tag without discarding a faster practice time.
export function trialMastery(variant, record, table = TRIAL_TARGETS) {
  const layout = Number(/v(\d+)$/.exec(String(variant))?.[1] || 1);
  if (!record || (record.layout ?? 1) !== layout || !validMs(variant, record.ms)) return null;
  const godUsed = record.godUsed === true;
  const ownEligible = !godUsed ? record.ms : null;
  const savedEligible = validMs(variant, record.bestEligibleMs) && record.bestEligibleMs >= record.ms ? record.bestEligibleMs : null;
  const bestEligibleMs = minMs(ownEligible, savedEligible);
  let medal = masteryTrialMedal(variant, record.ms / 1000, { godUsed }, table);
  const platinum = masteryTargets(variant, table)?.[3];
  if (platinum != null && bestEligibleMs != null && bestEligibleMs <= platinum * 1000) medal = 'platinum';
  return { ...record, godUsed, bestEligibleMs, medal };
}
export function mergeTrialMastery(variant, mine, incoming, table = TRIAL_TARGETS) {
  const a = trialMastery(variant, mine, table), b = trialMastery(variant, incoming, table);
  if (!a) return b;
  if (!b) return a;
  // A clean equal-time record wins the tie, preserving its matching pid/metadata.
  const winner = b.ms < a.ms || (b.ms === a.ms && a.godUsed && !b.godUsed) ? b : a;
  return trialMastery(variant, { ...winner, bestEligibleMs: minMs(a.bestEligibleMs, b.bestEligibleMs) }, table);
}
export const platinumHintVisible = (record) => ['gold', 'platinum'].includes(record?.medal);

export function perfectRun(stats, ctx = {}, def = {}) {
  if (!def.shipped || def.bonus || def.meta || !/^[1-6]$/.test(String(def.id)) ||
      ctx.trial || ctx.remix || ctx.rush || ctx.god || ctx.godUsed || stats?.godUsed || ctx.dda || ctx.ddaUsed) return false;
  // Hidden/Snack bones are optional secrets, not the Perfect Run condition.
  return Number.isFinite(stats?.breakables) && stats.breakables > 0 && stats.broken >= stats.breakables &&
    Number.isFinite(stats.dogsTotal) && stats.dogsTotal >= 0 && stats.dogs >= stats.dogsTotal && stats.deathsAtGate === 0;
}
export function bankPerfect(data, id, candidate, ctx = {}) {
  if (!/^[1-6]$/.test(String(id)) || !candidate || ctx.trial || ctx.remix || ctx.rush || ctx.god || ctx.godUsed || ctx.dda || ctx.ddaUsed) return false;
  data.perfect ||= {};
  const fresh = !data.perfect[id]; data.perfect[id] = true;
  return fresh;
}
export function bossMedalRows(data, registry) {
  return Object.values(registry.LEVELS || registry).filter((def) => def.shipped && !def.meta && def.bossKey && data.beaten?.[def.id]).map((def) => {
    const saved = data.bossMedals?.[def.bossKey] || {};
    return { level: def.id, key: def.bossKey, clear: saved.clear === true, noHit: saved.noHit === true,
      speed: saved.speed === true, bestMs: saved.bestMs > 0 ? saved.bestMs : null, targetMs: BOSS_SPEED_MS[def.bossKey] };
  });
}
