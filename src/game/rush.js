export const RUSH_ORDER = Object.freeze(['bird', 'cat', 'cone', 'titan', 'queen']);

export function createRush({ god = false } = {}) {
  return { index: 0, elapsed: 0, noHit: true, godUsed: !!god, complete: false };
}

export function tickRush(run, dt, { active = false, busy = false, paused = false, god = false } = {}) {
  run.godUsed ||= !!god;
  if (!run.complete && active && !busy && !paused && Number.isFinite(dt) && dt > 0) run.elapsed += dt;
}

export function hurtRush(run) { run.noHit = false; }

export function defeatRushBoss(run, key) {
  if (run.complete || RUSH_ORDER[run.index] !== key) return false;
  run.index++;
  run.complete = run.index === RUSH_ORDER.length;
  return true;
}

// Incomplete, abandoned and God-assisted runs cannot mutate a banked record.
export function rushResult(run, previous = {}) {
  if (!run.complete || run.godUsed || !Number.isFinite(run.elapsed) || run.elapsed < 0) return null;
  const bestMs = Math.max(1, Math.round(run.elapsed * 1000));
  return {
    clear: true,
    noHit: !!previous.noHit || run.noHit,
    bestMs: Number.isInteger(previous.bestMs) && previous.bestMs > 0 ? Math.min(previous.bestMs, bestMs) : bestMs,
  };
}
