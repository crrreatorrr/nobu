// Reward rules use raw pickups and never mutate an earned record backwards.
export const SNACK_TIERS = [0.4, 0.6, 0.8];
export const GOOD_BOY_MAX_DEATHS = { default: 3 };
export const SNACK_EXCLUDED = new Set(['coconut', 'mystery', 'jackpot', 'bark']);
export function snackTier(raw, potential) {
  if (!(potential > 0)) return 0;
  return SNACK_TIERS.filter((t) => raw >= Math.ceil(potential * t)).length;
}
export function boneContext(session, god = false) {
  return { trial: !!session.trial, remix: !!session.remix, rush: !!session.rush, god: !!god };
}
export function runBones(stats, ctx = {}) {
  if (ctx.trial || ctx.remix || ctx.rush) return null;
  return {
    golden: stats.breakables > 0 && stats.broken >= stats.breakables && stats.dogs >= stats.dogsTotal,
    goodBoy: !ctx.god && Number.isFinite(stats.deathsAtGate) && stats.deathsAtGate <= (GOOD_BOY_MAX_DEATHS[stats.level] ?? 3),
    hidden: !!stats.hiddenFound,
    snack: snackTier(stats.snackRaw, stats.snackPotential),
  };
}
export function savedBoard(save, id) {
  const board = save.boneBoard?.[id] || {};
  return { golden: !!board.golden || save.bones?.[id] === true, goodBoy: !!board.goodBoy, hidden: !!board.hidden, snack: Math.max(0, Math.min(3, board.snack || 0)) };
}
export function applyRunResults(save, id, run, { bonus = false } = {}) {
  if (!run) return [];
  save.boneBoard ||= {}; save.bones ||= {};
  const b = save.boneBoard[id] = savedBoard(save, id), fresh = [];
  for (const k of ['golden', 'goodBoy', 'hidden']) if (run[k] && !b[k]) { b[k] = true; fresh.push(k); }
  if (!bonus && run.snack > b.snack) {
    for (let t = b.snack + 1; t <= Math.min(3, run.snack); t++) fresh.push('snack' + t);
    b.snack = Math.min(3, run.snack);
  }
  if (b.golden) save.bones[id] = true;
  return fresh;
}
