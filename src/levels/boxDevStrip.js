// Development strip uses exactly the approved runtime pattern data and builder.
import { PATTERNS, TEACH_PATTERNS, placePattern } from './gauntletPatterns.js';
import { makeKit, makeTrack, turtle } from './kit.js';

export function boxStripSections(teach = false) {
  let d0 = 10;
  return (teach ? TEACH_PATTERNS : PATTERNS).map(pattern => {
    const section = { id: pattern.id, d0, end: d0 + pattern.pieces.find(p => p.kind === 'floorStart').dd, pattern };
    d0 = section.end + 32;
    return section;
  });
}
export function buildBoxDevStrip(game, stage, tickets, { teach = false } = {}) {
  const sections = boxStripSections(teach), end = sections.at(-1).end + 8;
  const track = makeTrack(stage, turtle([0, 0, 0], [[end, 0, 0]]));
  const k = makeKit(game, stage, tickets, track);
  stage.boxStrip = sections;
  stage.gauntlet = true; // The dev strip never creates a Ticket faucet.
  for (const [index, section] of sections.entries()) {
    const { pattern, d0 } = section;
    placePattern(k, pattern, d0, { gauntlet: true });
    const entry = pattern.pieces.find(p => p.kind === 'floorEnd');
    k.snacks(0, entry.y, d0 - 2);
    if (index) {
      const previous = sections[index - 1], exit = previous.pattern.pieces.find(p => p.kind === 'floorStart');
      k.floor(previous.end + 5, d0 - 5, { y: [exit.y, entry.y] });
    }
  }
  k.walls([[0, 4.3, 4.3], [end, 4.3, 4.3]]);
  k.backstop(0); k.backstop(end);
  return { spawn: k.W(0, 0, sections[0].d0 - 3), facing: track.yaw(0), camera: { mode: 'track', track, height: 4.3, dist: 8.6, ahead: 5.5 } };
}
