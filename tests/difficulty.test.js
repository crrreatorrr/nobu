import { describe, expect, it } from 'vitest';
import { BOSS, FLOOR, LEVEL_TIER, M2_ON, TIER, ULT_CHARGE } from '../src/config/difficulty.js';
import { Boss } from '../src/bosses/common.js';
import { MechaBird } from '../src/bosses/mechaBird.js';
import { BigCatBoss } from '../src/bosses/bigCat.js';
import { EvilCone } from '../src/bosses/evilCone.js';

const old = {
  bird: { hp: 6, perStage: 2, speed: [1, 1.2, 1.4], window: [2.7, 2.4, 2.2] },
  cat: { hp: 6, perStage: 2, speed: [1, 1.2, 1.45], window: [2.8, 2.4, 2] },
  cone: { hp: 9, perStage: 3, speed: [1, 1.25, 1.5], window: [1.8, 1.4, 1.1] },
};
const boss = (key) => new Boss({ game: {} }, 0, 0, 0, { key, name: key, portrait: key });

describe('M0 difficulty configuration', () => {
  it('leaves the M2 powers disabled and preserves the planned level tiers', () => {
    expect(M2_ON).toBe(false);
    expect(LEVEL_TIER).toEqual({ 1: 1, ride: 1.5, 2: 2, cave: 2.5, 3: 3, 4: 4, 6: 4.5, 5: 5 });
    expect(TIER).toEqual({ enemySpeed: [1, 1.08, 1.16, 1.24, 1.32], hazardPeriod: [1, 0.95, 0.9, 0.85, 0.8],
      crumbleDelay: [0.6, 0.55, 0.5, 0.45, 0.4], snacksGap: [70, 80, 90, 95, 100] });
  });

  it.each(Object.keys(old))('keeps every moved %s value equal to its old literal', (key) => {
    const b = boss(key), expected = old[key];
    expect(BOSS[key]).toMatchObject(expected);
    expect([b.hp, b.maxHp, b.phaseHp, b.stages]).toEqual([expected.hp, expected.hp, expected.perStage, 3]);
    for (let phase = 1; phase <= 3; phase++) {
      b.phase = phase;
      expect(b.sp).toBe(expected.speed[phase - 1]);
      expect(b.W).toBe(expected.window[phase - 1]);
      expect(b.tele(1)).toBe(1);
      expect(b.chainLen).toBe(1);
    }
  });

  it.each(Object.keys(BOSS))('%s has complete stage arrays and a monotonic stage ladder', (key) => {
    const d = BOSS[key];
    expect(d.stages * d.perStage).toBe(d.hp);
    for (const field of ['speed', 'window', 'tele', 'chain']) expect(d[field]).toHaveLength(d.stages);
    for (let i = 1; i < d.stages; i++) {
      expect(d.speed[i]).toBeGreaterThanOrEqual(d.speed[i - 1]);
      expect(d.chain[i]).toBeGreaterThanOrEqual(d.chain[i - 1]);
      expect(d.window[i]).toBeLessThanOrEqual(d.window[i - 1]);
      expect(d.tele[i]).toBeLessThanOrEqual(d.tele[i - 1]);
    }
  });

  it.each(Object.keys(BOSS))('clamps effective %s tells and windows to the fairness floor', (key) => {
    const b = boss(key);
    for (let phase = 1; phase <= b.stages; phase++) {
      b.phase = phase;
      // The written raw tele*.5 test contradicts the Queen's .62 multiplier.
      // Fairness applies to the effective tell(), as specified by the shared getter.
      expect(b.tele(0.5)).toBe(Math.max(FLOOR.teleSec, BOSS[key].tele[phase - 1] * 0.5));
      expect(b.tele(0.5)).toBeGreaterThanOrEqual(FLOOR.teleSec);
      expect(b.W).toBeGreaterThanOrEqual(FLOOR.windowSec);
    }
    expect(b.tele(0)).toBe(FLOOR.teleSec);
  });

  it.each([[MechaBird, 'bird'], [BigCatBoss, 'cat'], [EvilCone, 'cone']])('uses shared getters in the %s subclass', (Type, key) => {
    const b = Object.assign(Object.create(Type.prototype), { key, dda: { tele: 1, window: 0 } });
    for (let phase = 1; phase <= 3; phase++) {
      b.phase = phase;
      expect([b.sp, b.W]).toEqual([old[key].speed[phase - 1], old[key].window[phase - 1]]);
    }
  });

  it.each([1, 2, 3])('preserves the actual phase %i ultimate recharge rate', (phase) => {
    const b = boss('bird');
    b.active = true; b.phase = phase;
    b.stageAura = () => {}; b.ai = () => {};
    b.update([0, 13, 10, 7.5][phase]);
    expect(b.charge).toBe(0.5);
    expect(b.chargeTimes).toEqual([0, 26, 20, 15]);
    b.chargeTimes[phase] = 99;
    expect(ULT_CHARGE).toEqual([0, 26, 20, 15]);
  });
});
