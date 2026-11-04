// Dedicated boss-spec targets, measured in fight time (including retries).
export const BOSS_SPEED_MS = Object.freeze({ bird: 70000, cat: 80000, cone: 110000, titan: 120000, queen: 170000 });
export function newBossRun() { return { t: 0, noHit: true, void: false }; }
export function tickBossRun(run, dt, { active, busy = false, paused = false } = {}) {
  if (run && active && !busy && !paused && Number.isFinite(dt) && dt > 0) run.t += dt;
}
export function bossDda(deaths, ctx = {}) {
  const on = deaths >= 3 && !(ctx.god || ctx.trial || ctx.remix || ctx.rush || ctx.ranked || ctx.medal);
  return { tele: on ? 1.15 : 1, window: on ? 0.3 : 0, masks: on ? 1 : 0 };
}
export function bossMedals(key, run, previous = {}, ctx = {}) {
  // H20/bosses 1.6 is stricter than rewards 12.2: ANY DDA help voids
  // every award, including No-Hit and Clear, without revoking old records.
  if (!run || run.void || ctx.god || ctx.skipped || ctx.trial || ctx.remix || ctx.rush ||
      ctx.ranked || ctx.medal || !Object.hasOwn(BOSS_SPEED_MS, key)) return null;
  const ms = Math.max(1, Math.round(run.t * 1000));
  return {
    clear: true,
    noHit: !!previous.noHit || run.noHit,
    speed: !!previous.speed || ms <= BOSS_SPEED_MS[key],
    bestMs: previous.bestMs > 0 ? Math.min(previous.bestMs, ms) : ms,
  };
}
