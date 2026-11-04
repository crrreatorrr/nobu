import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('../src/art/assets.js', () => ({ Assets: { model: () => null, tex: () => new THREE.Texture(), tiled: () => new THREE.Texture(), aspect: () => 1, has: () => false } }));
vi.mock('../src/core/util.js', async original => ({ ...(await original()), canvasTex: () => new THREE.Texture() }));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
import { Stage, THEMES } from '../src/world/stage.js';
import { Vacuum, Broccoli, PillBot, ConeDrone } from '../src/entities/enemies.js';
import { remixEnemySpeed, tierValue } from '../src/config/difficulty.js';
afterEach(() => vi.restoreAllMocks());
function fixture(remix, tier = 2, phase = 'level') {
  const game = { session: { remix, phase, def: { tier } }, player: { pos: new THREE.Vector3(100, 0, 100) }, fx: {} };
  return new Stage(game, phase === 'boss' ? 'boss2' : 2);
}
it('clamps the remix enemy tier and interpolates fractional rows', () => {
  expect(remixEnemySpeed(1)).toBe(1.08);
  expect(remixEnemySpeed(2)).toBe(1.16);
  expect(remixEnemySpeed(4.5)).toBe(1.32);
  expect(remixEnemySpeed(5)).toBe(1.32);
  expect(tierValue('enemySpeed', 4.5)).toBeCloseTo(1.28);
});
it('scales patrol movement once while leaving elapsed attack time and ordinary/boss behavior unchanged', () => {
  const normal = new Vacuum(fixture(false), 0, 0, 0, { range: 20, speed: 4 });
  const remix = new Vacuum(fixture(true), 0, 0, 0, { range: 20, speed: 4 });
  const boss = new Vacuum(fixture(true, 5, 'boss'), 0, 0, 0, { range: 20, speed: 4 });
  for (const e of [normal, remix, boss]) { e.t = 0; e.update(.25); }
  expect(normal.off).toBe(1); expect(remix.off).toBeCloseTo(1.16); expect(boss.off).toBe(1);
  expect(remix.t).toBe(.25); expect(boss.movementMultiplier).toBe(1);
});
it('keeps a trooper warning and Pill windup at their authored duration rather than scaling dt', () => {
  const trooper = new Broccoli(fixture(true), 0, 0, 0, { variant: 'cone', range: 0 });
  trooper.attack = 0; trooper.update(.59); expect(trooper.attack).toBeCloseTo(.59);
  const pill = new PillBot(fixture(true), 0, 0, 0, { range: 0 });
  pill.mode = 'windup'; pill.modeT = 0;
  pill.update(.49); expect(pill.mode).toBe('windup'); expect(pill.modeT).toBe(.49);
});
it('speeds only a drone horizontal patrol clock, retaining its hover and warning clock', () => {
  const a = new ConeDrone(fixture(false), 0, 0, 0, { range: 3, speed: 1 });
  const b = new ConeDrone(fixture(true), 0, 0, 0, { range: 3, speed: 1 });
  a.t = b.t = a.movementT = b.movementT = 0;
  a.update(.5); b.update(.5);
  expect(a.pos.x).toBeCloseTo(3 * Math.sin(.5));
  expect(b.pos.x).toBeCloseTo(3 * Math.sin(.5 * 1.16));
  expect(b.pos.y).toBe(a.pos.y); expect(b.t).toBe(a.t);
});
it('clones the smog filter per on-foot Stage and restores normal/shared themes by construction', () => {
  const original = { ...THEMES[2] };
  const remix = fixture(true), normal = fixture(false), boss = fixture(true, 2, 'boss');
  expect(remix.theme).not.toBe(THEMES[2]);
  expect(remix.scene.fog.color.getHex()).not.toBe(original.fog);
  expect(normal.theme).toBe(THEMES[2]); expect(normal.scene.fog.color.getHex()).toBe(original.fog);
  expect(boss.theme).toBe(THEMES.boss2);
  expect(THEMES[2]).toEqual(original);
});
