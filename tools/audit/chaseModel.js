import { chaseSpeed } from '../../src/config/chase.js';
// Pure port of the Golden Bone audit. A segment begins at initial spawn or a checkpoint RESPawn;
// touching Snacks does not teleport/reset ChaseCat on a deathless run. This is a feasibility
// model (stationary break estimates, 8 m/s running), not an input recording or a playtest.
const damp = (x, target, k, dt) => x + (target - x) * (1 - Math.exp(-k * dt));
export function run({ start, catStart, delay, stops = [], until, blocked = [], pits = [], speed: speed0 = 6.7, catchUp = 1, dda = 1, model, scale = 1 }) {
  let ps = start, cs = catStart, speed = 2.5, wait = delay, leap = 0, pitWait = 0, pitEnd = 0, minGap = Infinity;
  const pending = stops.map((stop) => ({ ...stop, left: stop.dur }));
  const dt = 1 / 240;
  while (ps < until) {
    const stop = pending.find((item) => ps >= item.d && item.left > 0);
    if (stop) stop.left -= dt; else ps += 8 * dt;
    if (wait > 0) { wait -= dt; continue; }
    if (pitWait > 0) {
      pitWait -= dt;
      if (pitWait <= 0) cs = Math.min(ps - 2.4, Math.max(pitEnd, ps - 13));
      continue;
    }
    const gap = ps - cs;
    const target = chaseSpeed(gap, speed0, catchUp, dda);
    if (leap > 0) leap -= 8 * dt; else speed = damp(speed, target, 2, dt);
    if (model !== 'smog_wall' && leap <= 0 && blocked.some(([a, b]) => cs + 2.8 >= a && cs + 2.8 <= b)) {
      if (model === 'giant_coconut' && pits.some(([a,b])=>cs+2.8>=a && cs+2.8<=b)) {
        pitWait = .6; pitEnd = pits.find(([a,b])=>cs+2.8>=a && cs+2.8<=b)[1] + 1.4;
        continue;
      }
      speed = Math.max(speed, 7.5); leap = 4;
    }
    cs += speed * dt;
    minGap = Math.min(minGap, ps - cs);
    if (minGap < 2.4) return { dead: true, at: ps, minGap };
  }
  return { dead: false, minGap };
}
export function budget(segment, earlier, d) {
  let lo = 0, hi = 6;
  for (let i = 0; i < 30; i++) {
    const mid = (lo + hi) / 2;
    if (run({ ...segment, stops: [...earlier, { d: d - 0.8, dur: mid }] }).dead) hi = mid;
    else lo = mid;
  }
  return lo;
}

// Bite centers 1.8 m apart can hit two packs (radius .95 m, even ignoring box width).
// Greedily group neighboring packs at the midpoint. Animation .34 s + .08 cooldown between
// bites, plus the FULL lateral journey at run speed; no overlap of bite and travel assumed.
export function wallManeuver(xs) {
  const sorted = [...xs].sort((a, b) => a - b), centers = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i + 1 < sorted.length && sorted[i + 1] - sorted[i] <= 1.9) centers.push((sorted[i] + sorted[++i]) / 2);
    else centers.push(sorted[i]);
  }
  const travel = centers.at(-1) - centers[0];
  return { centers, dur: centers.length * 0.34 + (centers.length - 1) * 0.08 + travel / 8 };
}
export function chaseStops(items) {
  const groups = new Map();
  for (const item of items) {
    // Rugs are popped by the dock. Snacks end a rollback segment; neither needs a stop here.
    if (item.kind === 'rug' || item.kind === 'snacks') continue;
    if (!groups.has(item.d)) groups.set(item.d, []);
    groups.get(item.d).push(item);
  }
  return [...groups].sort(([a], [b]) => a - b).map(([d, group]) => ({
    d, dur: group.length > 1 ? wallManeuver(group.map((item) => item.x)).dur
      : group[0].kind === 'stack' ? group[0].height * 0.34 + (group[0].height - 1) * 0.08
        : group[0].kind === 'sphere' ? 0 // BlueSphere.onTouch pops it while running.
          : group[0].kind === 'zipped' ? 0.2 : 0.1,
  }));
}
export function checkpointSegments(layout, items) {
  const checkpoints = items.filter((item) => item.kind === 'snacks').map((item) => item.d).sort((a, b) => a - b);
  return [layout.start, ...checkpoints].map((start, index) => ({
    start, catStart: index ? start - 13 : layout.catStart,
    delay: index ? layout.respawnDelay : layout.initialDelay,
    until: checkpoints[index] ?? layout.gate, blocked: layout.blocked,
  }));
}
