// Fixed 60 Hz authoring checks; keep velocity-before-position order in sync with Player.
import { TUNING } from '../config/movement.js';
export const MOVE = { ...TUNING };
export const DT = 1 / 60;
export const FAIR = {
  1: { minFrames: 30, maxPct: .75, margin: .60, maxActions: 3, tell: .60 },
  2: { minFrames: 24, maxPct: .80, margin: .50, maxActions: 4, tell: .50 },
  3: { minFrames: 18, maxPct: .86, margin: .40, maxActions: 6, tell: .45 },
  4: { minFrames: 12, maxPct: .92, margin: .30, maxActions: 8, tell: .40 },
  5: { minFrames: 9, maxPct: .96, margin: .25, maxActions: 10, tell: .35 },
};
export function fair(tier) {
  if (!Number.isFinite(tier) || tier < 1 || tier > 5) throw new RangeError('Box tier must be between 1 and 5');
  const lo = FAIR[Math.floor(tier)], hi = FAIR[Math.ceil(tier)], f = tier % 1;
  const out = {};
  for (const key of Object.keys(lo)) out[key] = lo[key] + (hi[key] - lo[key]) * f;
  out.minFrames = Math.ceil(out.minFrames);
  out.maxActions = Math.floor(out.maxActions);
  // Decimal hundredths round toward the easier tier; maxPct deliberately stays exact (.775 at 1.5).
  for (const key of ['margin', 'tell']) out[key] = Math.ceil((out[key] - 1e-10) * 100) / 100;
  return out;
}

export function simJump({ velocity = TUNING.JUMP, held = true, cut = false,
  doubleAt = null, glide = false, dy = 0, speed = TUNING.RUN, maxTime = 15 } = {}) {
  let y = 0, vy = velocity, apex = 0, jumpCut = cut, doubled = false;
  const samples = [{ t: 0, x: 0, y: 0, vy }];
  for (let frame = 0; frame < maxTime / DT; frame++) {
    const t = frame * DT;
    if (doubleAt !== null && !doubled && t + 1e-9 >= doubleAt) {
      vy = TUNING.DOUBLE_JUMP; jumpCut = false; doubled = true;
    }
    if (!held && vy > 0 && !jumpCut) { vy *= .55; jumpCut = true; }
    let gravity = TUNING.GRAVITY * (vy < 0 ? TUNING.FALL_MULT : 1);
    if (held && Math.abs(vy) < 2.2 && !jumpCut) gravity *= .55;
    vy = Math.max(-TUNING.MAX_FALL, vy - gravity * DT);
    if (glide && doubled && vy < 0) vy = Math.max(vy, -2.4);
    y += vy * DT;
    apex = Math.max(apex, y);
    const air = (frame + 1) * DT;
    samples.push({ t: air, x: air * speed, y, vy });
    if (vy < 0 && y <= dy && (doubleAt === null || doubled)) {
      if (apex < dy) return null;
      return { dist: air * speed, apex, air, samples };
    }
  }
  return null;
}
export function reach(move, dy = 0, power = 16) {
  let opts = { dy };
  if (move === 'tap') opts.held = false;
  else if (move === 'held') { /* defaults */ }
  else if (move === 'bounceTap' || move === 'bounceHeld') {
    opts.held = move === 'bounceHeld'; opts.cut = !opts.held;
    opts.velocity = TUNING.STOMP_BOUNCE * (opts.held ? 1.15 : 1);
  } else if (move === 'arrowTap' || move === 'arrowHeld') {
    opts.held = move === 'arrowHeld'; opts.cut = true;
    opts.velocity = power * (opts.held ? 1.15 : 1);
  } else if (move === 'double' || move === 'glide') {
    let best = null;
    // The second press must occur before landing; search only the first jump's airborne frames.
    const first = simJump();
    for (let f = 1; f < Math.round(first.air / DT); f++) {
      const r = simJump({ dy, doubleAt: f * DT, glide: move === 'glide' });
      if (r && (!best || r.dist > best.dist)) best = r;
    }
    return best && { dist: best.dist, apex: best.apex, air: best.air };
  } else throw new RangeError(`Unknown jump move: ${move}`);
  const r = simJump(opts);
  return r && { dist: r.dist, apex: r.apex, air: r.air };
}
export function arrowReach(power, dy = 0, held = false) {
  const v = power * (held ? 1.15 : 1), apex = v * v / (2 * TUNING.GRAVITY);
  if (dy > apex) return null;
  const air = v / TUNING.GRAVITY + Math.sqrt(2 * (apex - dy) / (TUNING.GRAVITY * TUNING.FALL_MULT));
  return { dist: TUNING.RUN * air, apex, air };
}
// Intersection of A's solid interval and B's interval shifted backwards by flight time.
export function blinkWindow(on, off, delayB, airtime) {
  const cycle = on + off;
  let best = 0;
  for (let n = -2; n <= 2; n++) {
    const begin = delayB + n * cycle - airtime;
    best = Math.max(best, Math.min(on, begin + on) - Math.max(0, begin));
  }
  return Math.max(0, best);
}
export function fallWindow(delay) { return delay + TUNING.COYOTE; }
export function sliderGapWindow(S, range, speed, maxGap) {
  if (range === 0) return S <= maxGap ? 2 * Math.PI / speed : 0;
  const q = (S - maxGap) / (2 * range);
  if (q >= 1) return 0;
  if (q <= -1) return 2 * Math.PI / speed;
  return (Math.PI - 2 * Math.asin(q)) / speed;
}
export function doubleWindow(dyTarget, S) {
  const first = simJump(); let frames = 0;
  for (let f = 1; f < Math.round(first.air / DT); f++) {
    const r = simJump({ dy: dyTarget, doubleAt: f * DT });
    if (r && r.dist >= S) frames++;
  }
  return frames;
}
const timed = p => ['blink', 'fall', 'slide', 'arrow'].includes(p.kind);
const countable = p => p.countable ?? ['pack','stack','cat','rug','switch'].includes(p.kind);
const rest = p => ['floorStart', 'floorEnd', 'floor', 'lunch', 'rest'].includes(p.kind);
const top = p => (p.y || 0) + (['pack', 'stack'].includes(p.kind) ? (p.height || 1) : timed(p) || p.kind === 'lunch' ? .98 : 0);
// Sample actual takeoff and landing positions: a moving destination is not fixed at its home.
export function movingWindow(a, b, move, tier) {
  const rules = fair(tier), speed = Math.min(...[a,b].filter(p=>p.kind==='slide').map(p=>p.params?.speed ?? 1.5));
  const cycle = 2 * Math.PI / speed, samples = 1200, valid = [];
  let bestDistance = Infinity;
  const location = (p,t) => {
    const q = p.params || {}, off = p.kind === 'slide' ? Math.sin(t * (q.speed ?? 1.5) + (q.phase || 0)) * (q.range ?? 1.6) : 0;
    return { x:(p.x || 0)+(q.axis==='x'?off:0), d:(p.dd ?? p.d)+(q.axis==='z'?off:0), y:top(p)+(q.axis==='y'?off:0) };
  };
  for(let i=0;i<samples;i++) {
    const t=i*cycle/samples, from=location(a,t);
    let r=reach(move,top(b)-top(a),a.power||a.params?.power||16);
    for(let j=0;j<3 && r;j++)r=reach(move,location(b,t+r.air).y-from.y,a.power||a.params?.power||16);
    const to=r && location(b,t+r.air), dist=r?Math.hypot(to.x-from.x,to.d-from.d):Infinity;
    const ok=!!r && dist<=r.dist*rules.maxPct+1e-9 && r.dist-dist>=rules.margin-1e-9;
    valid.push(ok);if(ok)bestDistance=Math.min(bestDistance,dist);
  }
  let longest=0,run=0;
  for(let i=0;i<samples*2;i++){run=valid[i%samples]?Math.min(samples,run+1):0;longest=Math.max(longest,run);}
  return { seconds:longest*cycle/samples, bestDistance };
}
export function validatePattern(pattern, tier = pattern.tier) {
  const rules = fair(tier), problems = [], pieces = pattern.pieces || [];
  const add = (step, problem) => problems.push({ step, problem });
  let actions = 0;
  for (const [i,p] of pieces.entries()) {
    if (p.kind === 'fall' && (p.params?.delay ?? p.delay ?? .45) < rules.tell) add(i,'Fall contact tell shorter than tier minimum');
    if (timed(p) && p.countable) add(i,'Timed boxes must never be countable');
  }
  for (const [i, step] of (pattern.route || []).entries()) {
    const a = pieces[step.from], b = pieces[step.to];
    if (!a || !b) { add(i, 'Missing route piece'); continue; }
    if ((step.move || '').startsWith('arrow') && a.kind !== 'arrow') add(i,'Arrow launch requires an arrow box');
    if ((step.move || '').startsWith('bounce') && !['pack','stack','cat'].includes(a.kind)) add(i,'Bounce requires a breakable landing');
    const dy = top(b) - top(a);
    const dist = Math.hypot((b.x || 0) - (a.x || 0), (b.dd ?? b.d) - (a.dd ?? a.d));
    const running = step.move === 'run';
    const r = running ? null : reach(step.move || 'held', dy, a.power || a.params?.power || 16);
    const moving = !running && (a.kind === 'slide' || b.kind === 'slide') ? movingWindow(a,b,step.move || 'held',tier) : null;
    if(running && (Math.abs(dy) > .36 || dist > 1.01)) add(i,'Run route has a gap or unreachable step');
    if (!running && !moving && (!r || dist > r.dist * rules.maxPct + 1e-9)) add(i, `Reach: ${dist.toFixed(2)}m exceeds tier ${tier} ${r ? (r.dist * rules.maxPct).toFixed(2) : 'unreachable'}m`);
    if (!moving && r && r.dist - dist < rules.margin - 1e-9) add(i, 'Landing margin below tier minimum');
    let window = moving ? moving.seconds * 60 : Infinity;
    if (a.kind === 'blink' && b.kind === 'blink' && r) {
      const pa = a.params || a, pb = b.params || b;
      window = Math.min(window, blinkWindow(pa.on ?? 1.2, pa.off ?? 1, (pa.phase || 0) - (pb.phase || 0), r.air) * 60);
    }
    if (a.kind === 'fall') window = Math.min(window, fallWindow(a.params?.delay ?? a.delay ?? .45) * 60);
    if (step.move === 'double') window = Math.min(window, doubleWindow(dy, dist));
    if (Number.isFinite(window) && window + 1e-9 < Math.max(8, rules.minFrames)) add(i, `Input window ${window.toFixed(1)}f below ${Math.max(8, rules.minFrames)}f`);
    if (!running && timed(a)) actions++;
    if (actions > rules.maxActions) add(i, `Timed actions exceed ${rules.maxActions} before permanent rest`);
    if (rest(b)) actions = 0;
  }
  if (pattern.autoScroll) for (let a = 0; a < pieces.length; a++) for (let b = a + 1; b < pieces.length; b++) {
    if (countable(pieces[a]) && countable(pieces[b]) && Math.abs((pieces[a].dd ?? pieces[a].d) - (pieces[b].dd ?? pieces[b].d)) < .5) add(b, 'Countable pieces share distance during auto-scroll');
  }
  return problems;
}
