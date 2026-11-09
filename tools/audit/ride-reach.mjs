// Golden Bone audit model for the Roomba Rush ride (see docs/expansion/golden-bone-audit.md).
// Run: node tools/audit/ride-reach.mjs
// Roomba Rush: can one run ram every countable breakable? The ride drives itself at 10.5 m/s; steering moves
// at most 6.8 m/s sideways (player.js ride branch); a ram needs the player box (±0.36) to overlap the target box
// (backpack ±0.475, zipped same, cat ±0.5, sphere ±0.45). Bites are disabled while riding.
const items = [
  ['pack', -2.6, 68], ['pack', 0, 68], ['pack', 2.6, 68],
  ['zipped', -2.4, 160], ['pack', 2.4, 160],
  ['sphere', 0, 212],
  ['cat', -2.6, 222], ['pack', 2.6, 222],
  ['pack', -2.6, 270], ['pack', 0, 270],
  ['vacSwitch', 0, 286],
];
const tol = 0.36 + 0.475, FWD = 10.5, LAT = 6.8;
// group by d and check every same-d group, then check reachability between consecutive groups
const byD = new Map();
for (const [k, x, d] of items) { if (!byD.has(d)) byD.set(d, []); byD.get(d).push([k, x]); }
for (const [d, g] of byD) {
  const xs = g.map(([, x]) => x).sort((a, b) => a - b);
  const span = xs[xs.length - 1] - xs[0];
  const ok = span <= 2 * tol;
  console.log(`d=${d}: ${g.map(([k, x]) => `${k}@${x}`).join(', ')}  -> ${ok ? 'all reachable' : `only ${Math.ceil(1)} of ${g.length} per run (span ${span} m > ${(2 * tol).toFixed(2)} m)`}`);
}
// minimum stagger so two items `dx` apart laterally can both be rammed
const stagger = (dx) => Math.max(0, (Math.abs(dx) - 2 * tol) / LAT * FWD);
console.log('min stagger for 2.6 m lateral:', stagger(2.6).toFixed(2), 'm; for 5.2 m:', stagger(5.2).toFixed(2), 'm');
