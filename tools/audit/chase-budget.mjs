// Golden Bone audit model for the Scratchpost Canyon chase (see docs/expansion/golden-bone-audit.md).
// Run: node tools/audit/chase-budget.mjs
// Scratchpost Canyon chase budget. Cat model copied from src/bosses/bigCat.js ChaseCat.update (run state).
// Nobu: 8 m/s straight (TUNING.RUN), stops for `dur` seconds at given d. Pits/logs give the cat a leap speed floor of 7.5.
const O = 30, D = (d) => d + O;
const blocked = [[D(18),D(18.9)],[D(36),D(40)],[D(64),D(69)],[D(88),D(88.9)],[D(120),D(126)],[D(195),D(195.9)],[D(222),D(228)],[D(256),D(256.9)],[D(262),D(267)]];
const isBlocked = (s) => blocked.some(([a,b]) => s >= a && s <= b);
const damp = (x, t, k, dt) => x + (t - x) * (1 - Math.exp(-k * dt));
function run({ start, catStart, delay, stops, until }) {
  let ps = start, cs = catStart, sp = 2.5, wait = delay, t = 0, minGap = 1e9, minAt = 0, leap = 0;
  const st = stops.map((s) => ({ ...s, left: s.dur }));
  const dt = 1 / 240;
  while (ps < until) {
    t += dt;
    const stop = st.find((s) => ps >= s.d && s.left > 0);
    if (stop) stop.left -= dt; else ps += 8 * dt;
    if (wait > 0) { wait -= dt; continue; }
    const gap = ps - cs;
    const target = gap < 5 ? 6.7 : gap < 9 ? 6.7 + (gap - 5) * 0.375 : Math.min(10.5, 8.2 + (gap - 9) * 0.575);
    if (leap > 0) leap -= 8 * dt; else sp = damp(sp, target, 2, dt);
    if (leap <= 0 && isBlocked(cs + 2.8)) { sp = Math.max(sp, 7.5); leap = 4; }
    cs += sp * dt;
    const g = ps - cs;
    if (g < minGap) { minGap = g; minAt = ps; }
    if (g < 2.4) return { dead: true, at: ps - O, t, minGap: g };
  }
  return { dead: false, minGap, minAt: minAt - O };
}
// largest stationary time at d (after earlier stops) that survives
function budget(seg, earlier, d) {
  let lo = 0, hi = 6;
  for (let i = 0; i < 30; i++) {
    const m = (lo + hi) / 2;
    const r = run({ ...seg, stops: [...earlier, { d: D(d) - 0.8, dur: m }] });
    if (r.dead) hi = m; else lo = m;
  }
  return lo;
}
// checkpoint segments: Snacks at D(97) and D(173). Respawn: cat at checkpoint - 13, delay 1.6; first run: cat D(-13), Nobu D(2), delay 1.8
const segs = {
  A: { start: D(2), catStart: D(-13), delay: 1.8, until: D(97) },
  B: { start: D(97), catStart: D(97) - 13, delay: 1.6, until: D(173) },
  C: { start: D(173), catStart: D(173) - 13, delay: 1.6, until: D(302) },
};
// required stationary time estimates (optimistic = best bite placement with multi-hits; see notes)
const need = { w29: [1.5, 2.0], w114: [1.2, 1.6], st246: [0.45, 0.7], w250: [1.5, 2.0], z270slide: [0.1, 0.2], z270bite: [1.1, 1.4] };
const out = [];
out.push(['A wall 29 (5 packs)', budget(segs.A, [], 29), need.w29]);
out.push(['B wall 114 (4 packs)', budget(segs.B, [], 114), need.w114]);
out.push(['C stack 246 (2 high)', budget(segs.C, [], 246), need.st246]);
const e1 = [{ d: D(246) - 0.8, dur: need.st246[0] }];
out.push(['C wall 250 after stack (optimistic stack)', budget(segs.C, e1, 250), need.w250]);
out.push(['C wall 250 alone (stack skipped)', budget(segs.C, [], 250), need.w250]);
const e2 = [...e1, { d: D(250) - 0.8, dur: need.w250[0] }];
out.push(['C zipped 270 after both (if they were possible)', budget(segs.C, e2, 270), need.z270slide]);
for (const [name, b, [o, c]] of out) console.log(`${name.padEnd(48)} budget ${b.toFixed(2)} s   needs ${o}-${c} s   ${b >= c ? 'OK' : b >= o ? 'TIGHT (frame-perfect)' : 'IMPOSSIBLE'}`);
console.log('steady-state lead at full run:', run({ ...segs.C, stops: [] }).minGap.toFixed(2), 'm (min gap over segment C)');

console.log('\n-- fix: extra Snacks at D(238) --');
const Dseg = { start: D(238), catStart: D(238) - 13, delay: 1.6, until: D(302) };
const s1 = [{ d: D(246) - 0.8, dur: 0.7 }];
const s2 = [...s1, { d: D(250) - 0.8, dur: 2.0 }];
console.log('stack 246 budget', budget(Dseg, [], 246).toFixed(2), '(needs 0.7)');
console.log('wall 250 after stack budget', budget(Dseg, s1, 250).toFixed(2), '(needs 2.0)');
console.log('zipped 270 (bite route) after both', budget(Dseg, s2, 270).toFixed(2), '(needs 1.4; slide needs 0.2)');
const s3 = [...s2, { d: D(270) - 0.8, dur: 0.2 }];
console.log('packs 284 after all (slide on zipped)', budget(Dseg, s3, 284).toFixed(2), '(needs ~0.3)');

console.log('\n-- full fix: Snacks D(238), stack -> D(242), wall 250 gapped (4), zipped -> plain pack, packs 284/288 --');
const f1 = [{ d: D(242) - 0.8, dur: 0.7 }];
const f2 = [...f1, { d: D(250) - 0.8, dur: 1.6 }];
const f3 = [...f2, { d: D(270) - 0.8, dur: 0.1 }];
const rows = [['stack 242', budget(Dseg, [], 242), 0.7], ['gapped wall 250', budget(Dseg, f1, 250), 1.6], ['pack 270', budget(Dseg, f2, 270), 0.1], ['packs 284', budget(Dseg, f3, 284), 0.3]];
for (const [n, b, need] of rows) console.log(n.padEnd(18), 'budget', b.toFixed(2), 'needs', need, 'margin', (b / need).toFixed(1) + 'x');
