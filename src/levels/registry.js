import { buildLevel4 } from './level4.js';
import { buildBoss4Arena } from './boss4Arena.js';
import { RoombaTitan } from '../bosses/roombaTitan.js';
import { L3_SECTIONS } from './data/l3-layout.js';
import { L4_SECTIONS } from './data/laundry.js';
// The shipped levels, their map presentation and their entry rules live together.
// Keep map order explicit: integer object keys alone would put both bonuses last.
import { buildLevel1, buildBoss1Arena } from './level1.js';
import { buildBoss2Arena } from './level2.js';
import { buildLevel2Extended as buildLevel2 } from './level2Extended.js';
import { canyonSections } from './canyonMetadata.js';
import { buildLevel3, buildBoss3Arena } from './level3.js';
import { buildBonusRideCandidate as buildBonusRide } from './bonusRide.js';
import { buildBonusCaveCandidate as buildBonusCave } from './bonusCave.js';
import { MechaBird } from '../bosses/mechaBird.js';
import { BigCatBoss } from '../bosses/bigCat.js';
import { EvilCone } from '../bosses/evilCone.js';
import { L1_SECTIONS_EXTENDED } from './data/l1-layout2.js';
import { LEVEL_DOGS } from './metadata.js';
import { levelSections, HIDDEN_SECTION } from './sections.js';
import { bonusSectionsV2 } from './bonusMetadata.js';
import { SECTION_TEXT, BONUS_EXTENSION_TEXT, L4_TEXT } from '../story/script.js';
import { buildGauntlet1, buildGauntlet2, buildGauntlet3 } from './gauntlets.js';
import { GAUNTLET_INFO } from './data/gauntlets.js';

const mainOpen = (id) => (data) => data.v >= 3 ? !!data.open?.[id] : id <= data.unlocked;
const bonusOpen = (id, after) => (data) => data.v >= 3 ? !!data.open?.[id]
  : !!data.beaten?.[after] || !!data.bonus?.[id]?.found || !!data.bonus?.[id]?.beaten;

export const LEVELS = {
  1: {
    id: 1, name: 'Bark Jungle', build: buildLevel1, arena: buildBoss1Arena,
    Boss: MechaBird, bossKey: 'bird', theme: 1, bossTheme: 'boss1', bonus: false,
    tier: 1, unlock: mainOpen(1), mapPos: { x: 24, y: 70 }, trial: true, shipped: true,
    // Stable authoring order for lossless count-to-id migration in save v3.
    dogs: LEVEL_DOGS['1'],
    sections: [...L1_SECTIONS_EXTENDED.map(([d0,d1,key])=>({d0,d1,name:SECTION_TEXT[key]})),
      {d0:228,d1:258,name:SECTION_TEXT.burrow,detour:true},
      {d0:467,d1:504,name:SECTION_TEXT.waterfallHollow,detour:true}].sort((a,b)=>a.d0-b.d0),
    hidden: {section:SECTION_TEXT.burrow,move:'dust'},
  },
  ride: {
    id: 'ride', name: 'Roomba Rush', build: buildBonusRide, theme: 'house', bonus: true,
    tier: 1.5, unlock: bonusOpen('ride', 0), mapPos: { x: 34, y: 55 }, trial: false, shipped: true,
    dogs: LEVEL_DOGS['ride'], sections: bonusSectionsV2('ride', SECTION_TEXT, BONUS_EXTENSION_TEXT),
    hidden: { section: BONUS_EXTENSION_TEXT.ride.sofa, move: null },
  },
  2: {
    id: 2, name: 'Scratchpost Canyon', build: buildLevel2, arena: buildBoss2Arena,
    Boss: BigCatBoss, bossKey: 'cat', theme: 2, bossTheme: 'boss2', bonus: false,
    tier: 2, unlock: mainOpen(2), mapPos: { x: 50, y: 50 }, trial: true, shipped: true,
    dogs: LEVEL_DOGS['2'], sections: canyonSections(SECTION_TEXT),
    hidden: {section:SECTION_TEXT.catFlapAlley,move:'glide'},
  },
  cave: {
    id: 'cave', name: 'Glowworm Grotto', build: buildBonusCave, theme: 'cave', bonus: true,
    tier: 2.5, unlock: bonusOpen('cave', 1), mapPos: { x: 66, y: 62 }, trial: false, shipped: true,
    dogs: LEVEL_DOGS['cave'], sections: bonusSectionsV2('cave', SECTION_TEXT, BONUS_EXTENSION_TEXT),
    hidden: { section: BONUS_EXTENSION_TEXT.cave.hollow, move: null },
  },
  3: {
    id: 3, name: 'The Cone Factory', build: buildLevel3, arena: buildBoss3Arena,
    Boss: EvilCone, bossKey: 'cone', theme: 3, bossTheme: 'boss3', bonus: false,
    tier: 3, unlock: mainOpen(3), mapPos: { x: 77, y: 27 }, trial: true, shipped: true,
    dogs: LEVEL_DOGS['3'],
    sections: [...L3_SECTIONS.map(([d0,d1,key])=>({d0,d1,name:SECTION_TEXT[key]})),
      {d0:188,d1:201,name:SECTION_TEXT.maintenanceDucts,detour:true},
      {d0:276,d1:312,name:SECTION_TEXT.overheadRails,detour:true}].sort((a,b)=>a.d0-b.d0),
    hidden: {section:SECTION_TEXT.maintenanceDucts,move:'bark'},
  },
  4: {
    id: 4, name: L4_TEXT.name, build: buildLevel4, arena: buildBoss4Arena,
    Boss: RoombaTitan, bossKey: 'titan', theme: 4, bossTheme: 'boss4', bonus: false,
    tier: 4, unlock: mainOpen(4), mapPos: { x: 88, y: 40 }, trial: true, shipped: true,
    dogs: LEVEL_DOGS[4],
    sections: [...L4_SECTIONS.map(([d0,d1,key])=>({d0,d1,name:L4_TEXT.sections[key]})),
      {d0:118.5,d1:160.001,name:L4_TEXT.sections.topShelf,detour:true},
      {d0:186,d1:246.001,name:L4_TEXT.sections.pantry,detour:true}].sort((a,b)=>a.d0-b.d0),
    hidden: { section: L4_TEXT.sections.basement, move: 'dust' },
  },
  kennel: { id: 'kennel', name: 'The Kennel', meta: true, bonus: false, shipped: true, trial: false,
    mapPos: { x: 88, y: 72 }, unlock: (data) => !!data.open?.kennel },
  ...Object.fromEntries([buildGauntlet1, buildGauntlet2, buildGauntlet3].map((build, i) => {
    const id = `g${i + 1}`;
    return [id, { ...GAUNTLET_INFO[id], build, gauntlet: true, bonus: true, bones: false,
      trial: false, shipped: true, dogs: {},
      unlock: (data) => !!(data.gauntlets?.[id]?.found || data.gauntlets?.[id]?.polaroid) }];
  })),
};

for (const [id, def] of Object.entries(LEVELS)) {
  def.sections ??= levelSections(id, SECTION_TEXT);
  if (HIDDEN_SECTION[id]) def.hidden ??= { section: SECTION_TEXT[HIDDEN_SECTION[id]], move: null };
}

export const MAP_ORDER = [1, 'ride', 2, 'cave', 3, 4, 'kennel'];
export const LEVEL_NAMES = Object.fromEntries(Object.entries(LEVELS).map(([id, def]) => [id, def.name]));

// Numeric ids and their save-key strings resolve to the same definition.
export const levelDef = (id) => Object.hasOwn(LEVELS, id) ? LEVELS[id] : undefined;
export const isOpen = (id, data) => !!levelDef(id)?.unlock(data);
export const playOrder = () => MAP_ORDER.filter((id) => !levelDef(id).bonus && !levelDef(id).meta);
