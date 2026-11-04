import { describe, expect, it } from 'vitest';
import { LEVELS, LEVEL_NAMES, MAP_ORDER, isOpen, levelDef, playOrder } from '../src/levels/registry.js';
import { LEVEL_DOGS, LEVEL_IDS } from '../src/levels/metadata.js';
import { LEVEL_NAMES as SESSION_NAMES, Session } from '../src/game/session.js';
import { buildLevel1, buildBoss1Arena } from '../src/levels/level1.js';
import { buildBoss2Arena } from '../src/levels/level2.js';
import { buildLevel2Extended as buildLevel2 } from '../src/levels/level2Extended.js';
import { buildLevel3, buildBoss3Arena } from '../src/levels/level3.js';
import { buildBonusRideCandidate as buildBonusRide } from '../src/levels/bonusRide.js';
import { buildBonusCaveCandidate as buildBonusCave } from '../src/levels/bonusCave.js';
import { MechaBird } from '../src/bosses/mechaBird.js';
import { BigCatBoss } from '../src/bosses/bigCat.js';
import { buildLevel4 } from '../src/levels/level4.js';
import { buildBoss4Arena } from '../src/levels/boss4Arena.js';
import { RoombaTitan } from '../src/bosses/roombaTitan.js';
import { EvilCone } from '../src/bosses/evilCone.js';

const oldMapOpen = (id, data) => {
  const after = { ride: 0, cave: 1 };
  if (id in after) return !!data.beaten[after[id]] || !!data.bonus?.[id]?.found || !!data.bonus?.[id]?.beaten;
  return id <= data.unlocked;
};

describe('level registry', () => {
  it('keeps the current map order, node positions and main-level ids', () => {
    expect(MAP_ORDER).toEqual([1, 'ride', 2, 'cave', 3, 4, 'kennel']);
    expect(playOrder()).toEqual([1, 2, 3, 4]);
    expect(MAP_ORDER.map((id) => levelDef(id).mapPos)).toEqual([
      { x: 24, y: 70 }, { x: 34, y: 55 }, { x: 50, y: 50 }, { x: 66, y: 62 }, { x: 77, y: 27 }, { x: 88, y: 40 }, { x: 88, y: 72 },
    ]);
    for (const id of [1, 2, 3, 4]) {
      expect(levelDef(id).id).toBe(id);
      expect(levelDef(String(id))).toBe(levelDef(id));
    }
  });

  it.each([
    { unlocked: 1, beaten: [false, false, false] },
    { unlocked: 2, beaten: [true, false, false] },
    { unlocked: 3, beaten: [true, true, false] },
    { unlocked: 3, beaten: [true, true, true] },
  ])('preserves unlocks for story progress %j', (data) => {
    expect(MAP_ORDER.filter((id) => isOpen(id, data))).toEqual(MAP_ORDER.filter((id) => oldMapOpen(id, data)));
  });

  it.each(['ride', 'cave'])('opens %s by discovery, bonus clear, or its preceding boss', (id) => {
    const data = { unlocked: 1, beaten: [false, false, false], bonus: {} };
    expect(isOpen(id, data)).toBe(false);
    for (const state of [{ found: true }, { beaten: true }]) {
      data.bonus[id] = state;
      expect(isOpen(id, data)).toBe(true);
    }
    data.bonus = {};
    data.beaten[id === 'ride' ? 0 : 1] = true;
    expect(isOpen(id, data)).toBe(true);
  });

  it('selects current builders with their arenas, bosses, themes and names', () => {
    const expected = [
      [1, buildLevel1, buildBoss1Arena, MechaBird, 'bird', 1, 'boss1', 'Bark Jungle'],
      [2, buildLevel2, buildBoss2Arena, BigCatBoss, 'cat', 2, 'boss2', 'Scratchpost Canyon'],
      [3, buildLevel3, buildBoss3Arena, EvilCone, 'cone', 3, 'boss3', 'The Cone Factory'],
      [4, buildLevel4, buildBoss4Arena, RoombaTitan, 'titan', 4, 'boss4', 'Laundry Day'],
      ['ride', buildBonusRide, undefined, undefined, undefined, 'house', undefined, 'Roomba Rush'],
      ['cave', buildBonusCave, undefined, undefined, undefined, 'cave', undefined, 'Glowworm Grotto'],
    ];
    for (const [id, build, arena, Boss, bossKey, theme, bossTheme, name] of expected) {
      expect(levelDef(id)).toMatchObject({ build, theme, name });
      expect([levelDef(id).arena, levelDef(id).Boss, levelDef(id).bossKey, levelDef(id).bossTheme]).toEqual([arena, Boss, bossKey, bossTheme]);
      expect(new Session({}, id).def).toBe(levelDef(id));
    }
    expect(SESSION_NAMES).toBe(LEVEL_NAMES);
  });

  it('marks only current content shipped and only main levels trial-enabled', () => {
    expect(MAP_ORDER.filter((id) => !levelDef(id).meta).map((id) => levelDef(id).tier)).toEqual([1, 1.5, 2, 2.5, 3, 4]);
    expect(Object.values(LEVELS).every((def) => def.shipped)).toBe(true);
    expect(MAP_ORDER.filter((id) => levelDef(id).trial)).toEqual([1, 2, 3, 4]);
    for (const id of [5, 6, 'toString']) {
      expect(levelDef(id)).toBeUndefined();
      expect(isOpen(id, { unlocked: 9 })).toBe(false);
    }
    // A caller cannot accidentally change the order by sorting its result.
    playOrder().reverse();
    expect(playOrder()).toEqual([1, 2, 3, 4]);
  });

  it('exposes migration dog ids in stable authoring order with current counts', () => {
    expect(LEVEL_IDS).toEqual(['1', '2', '3', '4', '5', '6', 'ride', 'cave']);
    expect(MAP_ORDER.filter((id) => !levelDef(id).meta).map((id) => Object.keys(levelDef(id).dogs).length)).toEqual([9, 4, 7, 4, 9, 7]);
    expect(Object.keys(LEVEL_DOGS[1])).toEqual(['shiba-a','pug-a','dalmatian-a','shiba-b','corgi-a','pug-b','dalmatian-b','corgi-b','shiba-c']);
    const ids = [];
    for (const def of Object.values(LEVELS).filter((d) => !d.meta && !d.gauntlet)) {
      expect(def.dogs).toBe(LEVEL_DOGS[def.id]);
      for (const [dog, section] of Object.entries(def.dogs)) {
        const id = `${def.id}:${dog}`;
        expect(id).toMatch(/^(1|2|3|4|ride|cave):[a-z]+-[a-z0-9]+$/);
        expect(section.length).toBeGreaterThan(0);
        ids.push(id);
      }
    }
    expect(new Set(ids).size).toBe(40);
  });
});
