// The shipped levels, their map presentation and their entry rules live together.
// Keep map order explicit: integer object keys alone would put both bonuses last.
import { buildLevel1, buildBoss1Arena } from './level1.js';
import { buildLevel2, buildBoss2Arena } from './level2.js';
import { buildLevel3, buildBoss3Arena } from './level3.js';
import { buildBonusRide } from './bonusRide.js';
import { buildBonusCave } from './bonusCave.js';
import { MechaBird } from '../bosses/mechaBird.js';
import { BigCatBoss } from '../bosses/bigCat.js';
import { EvilCone } from '../bosses/evilCone.js';
import { LEVEL_DOGS } from './metadata.js';

const mainOpen = (id) => (data) => id <= data.unlocked;
const bonusOpen = (id, after) => (data) => !!data.beaten?.[after]
  || !!data.bonus?.[id]?.found || !!data.bonus?.[id]?.beaten;

export const LEVELS = {
  1: {
    id: 1, name: 'Bark Jungle', build: buildLevel1, arena: buildBoss1Arena,
    Boss: MechaBird, bossKey: 'bird', theme: 1, bossTheme: 'boss1', bonus: false,
    tier: 1, unlock: mainOpen(1), mapPos: { x: 24, y: 70 }, trial: true, shipped: true,
    // Stable authoring order for lossless count-to-id migration in save v3.
    dogs: LEVEL_DOGS['1'],
  },
  ride: {
    id: 'ride', name: 'Roomba Rush', build: buildBonusRide, theme: 'house', bonus: true,
    tier: 1.5, unlock: bonusOpen('ride', 0), mapPos: { x: 34, y: 55 }, trial: false, shipped: true,
    dogs: LEVEL_DOGS['ride'],
  },
  2: {
    id: 2, name: 'Scratchpost Canyon', build: buildLevel2, arena: buildBoss2Arena,
    Boss: BigCatBoss, bossKey: 'cat', theme: 2, bossTheme: 'boss2', bonus: false,
    tier: 2, unlock: mainOpen(2), mapPos: { x: 50, y: 50 }, trial: true, shipped: true,
    dogs: LEVEL_DOGS['2'],
  },
  cave: {
    id: 'cave', name: 'Glowworm Grotto', build: buildBonusCave, theme: 'cave', bonus: true,
    tier: 2.5, unlock: bonusOpen('cave', 1), mapPos: { x: 66, y: 62 }, trial: false, shipped: true,
    dogs: LEVEL_DOGS['cave'],
  },
  3: {
    id: 3, name: 'The Cone Factory', build: buildLevel3, arena: buildBoss3Arena,
    Boss: EvilCone, bossKey: 'cone', theme: 3, bossTheme: 'boss3', bonus: false,
    tier: 3, unlock: mainOpen(3), mapPos: { x: 77, y: 27 }, trial: true, shipped: true,
    dogs: LEVEL_DOGS['3'],
  },
};

export const MAP_ORDER = [1, 'ride', 2, 'cave', 3];
export const LEVEL_NAMES = Object.fromEntries(Object.entries(LEVELS).map(([id, def]) => [id, def.name]));

// Numeric ids and their save-key strings resolve to the same definition.
export const levelDef = (id) => Object.hasOwn(LEVELS, id) ? LEVELS[id] : undefined;
export const isOpen = (id, data) => !!levelDef(id)?.unlock(data);
export const playOrder = () => MAP_ORDER.filter((id) => !levelDef(id).bonus);
