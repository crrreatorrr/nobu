import { boneContext } from './bones.js';
// Chain rules have no rendering or economy dependencies. The caller owns drops and HUD.
export const CHAIN_WINDOW = 1.1;
export const createChain = () => ({ n: 0, t: 0, best: 0, sphereGiven: false, lastBy: null });
export const rewardCtx = (s, god = false) => ({ ...boneContext(s, god), arena: s.phase === 'boss' });
export const chainPitch = (n) => 2 ** (Math.min(Math.max(0, n - 1), 12) / 12);
export function endChain(c) {
  const n = c.n;
  c.best = Math.max(c.best, n);
  c.n = 0; c.t = 0; c.lastBy = null;
  return n;
}
export function resetChain(c, section = false) {
  const n = endChain(c);
  if (section) c.sphereGiven = false;
  return n;
}
export function chainHit(c, ctx = {}, by = null) {
  if (ctx.arena) return null;
  c.n++; c.t = CHAIN_WINDOW; c.lastBy = by;
  const sphere = c.n >= 8 && !c.sphereGiven && !ctx.trial;
  if (sphere) c.sphereGiven = true;
  return { n: c.n, pitch: chainPitch(c.n), sphere, punch: c.n === 5 || c.n === 10 };
}
export function refreshChain(c) { if (c.n > 0) c.t = CHAIN_WINDOW; }
export function tickChain(c, dt, { grounded = false, ride = false, busy = false } = {}) {
  if (c.n && !busy && (grounded || ride)) {
    c.t = Math.max(0, c.t - Math.max(0, dt));
    if (c.t <= 1e-9) return endChain(c);
  }
  return 0;
}
export function bankChain(data, id, stats, ctx = {}) {
  if (ctx.trial || ctx.remix || ctx.rush) return false;
  const n = Math.max(0, Math.floor(stats.bestChain || 0));
  data.bestChain ||= {}; data.chainBadges ||= {};
  const old = data.bestChain[id] || 0;
  data.bestChain[id] = Math.max(old, n);
  if (n >= 15) data.chainBadges[id] = true;
  return old > 0 && n > old;
}
