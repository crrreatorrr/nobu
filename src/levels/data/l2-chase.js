// Authoring distances, before level2's +30 m track offset. The level and audit share this list.
const wall = (d, gap = false) => [-3.6, -1.8, 0, 1.8, 3.6]
  .filter((x) => !(gap && x === 0)).map((x) => ({ kind: 'pack', x, y: 0, d }));
export const L2_CHASE_BREAKABLES = [
  ...wall(29),
  { kind: 'rug', x: -2.9, y: 0, d: 56 }, { kind: 'rug', x: 2.9, y: 0, d: 56 },
  { kind: 'snacks', x: 0, y: 0, d: 97 },
  { kind: 'cat', x: 2.9, y: 0, d: 108 }, ...wall(114, true),
  { kind: 'sphere', x: 0, y: 0, d: 130 },
  { kind: 'rug', x: 0, y: 0, d: 152 }, { kind: 'rug', x: -3, y: 0, d: 152 },
  { kind: 'snacks', x: 0, y: 0, d: 173 },
  { kind: 'snacks', x: 0, y: 0, d: 238 },
  { kind: 'stack', x: -3.6, y: 0, d: 242, height: 2 }, ...wall(250, true),
  { kind: 'snacks', x: 0, y: 0, d: 268 },
  // 25 m after the long wall maneuver; the audit's d270 left only 20 m recovery.
  { kind: 'pack', x: -3, y: 0, d: 275 },
  { kind: 'pack', x: -2.8, y: 0, d: 284 }, { kind: 'pack', x: 2.8, y: 0, d: 288 },
  { kind: 'vacSwitch', x: 0, y: 0, d: 293 },
];
export const L2_CHASE = {
  offset: 30, start: 2, catStart: -13, initialDelay: 1.8, respawnDelay: 1.6, gate: 302,
  blocked: [[18, 18.9], [36, 40], [64, 69], [88, 88.9], [120, 126], [195, 195.9], [222, 228], [256, 256.9], [262, 267]],
};
