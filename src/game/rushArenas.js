import { buildBoss1Arena } from '../levels/level1.js';
import { buildBoss2Arena } from '../levels/level2.js';
import { buildBoss3Arena } from '../levels/level3.js';
import { buildBoss4Arena } from '../levels/boss4Arena.js';
import { buildBoss5Arena } from '../levels/boss5Arena.js';
import { MechaBird } from '../bosses/mechaBird.js';
import { BigCatBoss } from '../bosses/bigCat.js';
import { EvilCone } from '../bosses/evilCone.js';
import { RoombaTitan } from '../bosses/roombaTitan.js';
import { PumpQueen } from '../bosses/pumpQueen.js';
import { MASTERY_TEXT } from '../story/script.js';

// L6 has no boss. Queen's released arena is independent of H50's on-foot builder.
export const RUSH_ARENAS = Object.freeze([
  ['bird', buildBoss1Arena, MechaBird, 'boss1'],
  ['cat', buildBoss2Arena, BigCatBoss, 'boss2'],
  ['cone', buildBoss3Arena, EvilCone, 'boss3'],
  ['titan', buildBoss4Arena, RoombaTitan, 'boss4'],
  ['queen', buildBoss5Arena, PumpQueen, 'boss5'],
].map(([bossKey, arena, Boss, bossTheme]) => Object.freeze({ bossKey, arena, Boss, bossTheme, name: MASTERY_TEXT.bossNames[bossKey] })));

export const rushAvailable = (data) => !!data.beaten?.[5] && RUSH_ARENAS.length === 5;

// Arena recipes keep their normal signatures, but Rush creates no economic actors.
export class RushTickets {
  constructor() { this.list = []; this.flying = []; this.total = 0; }
  add() { return null; }
  line() {}
  arc() {}
  finalize() {}
  spawnFlying() {}
  update() {}
  clearFlying() {}
  restoreAfter() {}
}
