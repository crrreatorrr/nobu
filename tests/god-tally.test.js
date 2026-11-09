import * as THREE from 'three';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js', () => ({
  Assets: { model: vi.fn(() => null), tex: () => new THREE.Texture(), tiled: () => new THREE.Texture(), has: () => false, aspect: () => 1, url: () => '' }
}));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
import { Player } from '../src/player/player.js';
import { GOD_HIT_WINDOW, countGodHit, createGodTally, godTallyText, tickGodTally } from '../src/game/godTally.js';

describe('god tally', () => {
  it('counts one hit per touch window and a lethal one as a death too', () => {
    const t = createGodTally();
    expect(countGodHit(t)).toBe(true);
    expect(countGodHit(t)).toBe(false); // same touch, next frame
    tickGodTally(t, GOD_HIT_WINDOW);
    expect(countGodHit(t, { lethal: true })).toBe(true);
    expect(godTallyText(t)).toBe('HITS 2 · DEATHS 1');
  });

  it('a pit right after a bump adds a death but not a second hit', () => {
    const t = createGodTally();
    countGodHit(t);
    expect(countGodHit(t, { lethal: true })).toBe(true);
    expect(countGodHit(t, { lethal: true })).toBe(false);
    expect(t).toMatchObject({ hits: 1, deaths: 1 });
  });
});

describe('player in god mode', () => {
  const fake = (mask = 0) => {
    const ui = { godTally: vi.fn() };
    const p = Object.create(Player.prototype, { god: { value: true }, gear: { value: {} }, invincible: { value: false } });
    Object.assign(p, { mode: 'normal', invulnT: 0, frozen: false, guardCharges: 0, game: { ui, session: { mask } }, _clearDustFov() {}, _rescue: vi.fn() });
    p.resetGodTally();
    return p;
  };

  it('tallies blocked hits and deaths without taking damage', () => {
    const p = fake();
    expect(p.hurt('angel', 0, 0)).toBe(false);
    expect(p.mode).toBe('normal');
    expect(p.godTally).toMatchObject({ hits: 1, deaths: 1 });
    tickGodTally(p.godTally, GOD_HIT_WINDOW);
    p.die('fall');
    expect(p._rescue).toHaveBeenCalled();
    expect(p.godTally).toMatchObject({ hits: 2, deaths: 2 });
    expect(p.game.ui.godTally).toHaveBeenLastCalledWith(p.godTally);
  });

  it('a hit a mask would have absorbed is not a death, and the mask stays', () => {
    const p = fake(2);
    p.hurt('angel');
    tickGodTally(p.godTally, GOD_HIT_WINDOW);
    p.cone(3);
    expect(p.godTally).toMatchObject({ hits: 2, deaths: 0 });
    expect(p.game.session.mask).toBe(2);
    expect(p.conedT).toBeUndefined();
  });
});
