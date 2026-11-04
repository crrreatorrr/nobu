import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { World } from '../src/world/physics.js';
import { drumPos, drumSpeed, toasterCycle } from '../src/entities/propsTiming.js';
import { SpinDrum, Toaster } from '../src/entities/props2.js';
import { MarketClock, MarketPlatform } from '../src/entities/market.js';

vi.mock('../src/art/assets.js', () => ({ Assets: { tiled: () => null } }));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
vi.mock('../src/entities/fx.js', () => ({ textSprite: () => new THREE.Sprite() }));

function stageStub() {
  const player = { pos: new THREE.Vector3(0, 1, 0), vel: new THREE.Vector3(), body: { grounded: false, ground: null }, bounce: vi.fn() };
  return { world: new World(), theme: { platform: 'test' }, entities: [], game: { player, session: {}, ui: {}, fx: {} } };
}

describe('SpinDrum timing and rollback', () => {
  it('returns to the same track point after a full turn on either axis and direction', () => {
    for (const axis of ['x', 'z']) for (const dir of [-1, 1]) {
      const opts = { axis, dir, x: 2, y: 4, d: 20, phase: 0.4 };
      const start = drumPos(1, 0, opts), end = drumPos(1, 6, opts);
      for (const key of ['x', 'y', 'd']) expect(end[key]).toBeCloseTo(start[key]);
    }
    expect(drumSpeed()).toBeLessThanOrEqual(3.4);
    expect(drumSpeed(4, 6)).toBeGreaterThan(3.4);
  });
  it('updates moving Solid deltas and restores a crumbled slot without resetting orbital time', () => {
    const stage = stageStub(), drum = new SpinDrum(stage, null, 20, { y: 4, crumble: [0] });
    const slot = drum.parts[0];
    stage.game.player.body = { grounded: true, ground: slot.solid };
    stage.world.beginFrame(); drum.update(0.1);
    expect(slot.solid.delta.y).not.toBe(0);
    drum.update(0.5); drum.update(0.25);
    expect(slot.state).toBe('fall');
    expect(slot.solid.enabled).toBe(false);
    stage.game.player.body.grounded = false;
    const time = drum.t;
    drum.onRespawn();
    expect(drum.t).toBe(time);
    expect(slot.state).toBe('idle');
    expect(slot.solid.enabled).toBe(true);
    expect(slot.fall).toBe(0);
  });
});

describe('shared MarketClock', () => {
  it('uses the music step and smooths from the prior value for exactly 0.45 seconds', () => {
    const clock = new MarketClock(stageStub(), 128);
    expect(clock.step).toBe(0.9375);
    expect(clock.level('b', -1)).toBe(0);
    expect(clock.value('b')).toBe(0);
    clock.update(0.225);
    expect(clock.value('b')).toBeCloseTo(0.5);
    clock.update(0.225);
    expect(clock.value('b')).toBe(1);
    clock.update(0.9375 - 0.45);
    expect(clock.k).toBe(1);
    expect(clock.value('b')).toBe(1);
    expect(clock.next('b')).toBe(-1);
  });
  it('keeps inverse platforms synchronized when far away and after respawn', () => {
    const stage = stageStub(), clock = new MarketClock(stage, 128);
    const a = new MarketPlatform(stage, 0, 4, -300, { clock, group: 'b' });
    const b = new MarketPlatform(stage, 3, 4, -300, { clock, group: 'b', invert: true });
    clock.update(0.45); a.update(); b.update();
    expect(a.pos.y).toBeCloseTo(6.2); expect(b.pos.y).toBeCloseTo(1.8);
    expect(a.alwaysActive && b.alwaysActive && clock.alwaysActive).toBe(true);
    expect(a.edge.material.color.getHex()).toBe(0xff4a5a);
    expect(b.edge.material.color.getHex()).toBe(0x4ade80);
    clock.onRespawn(); a.onRespawn(); b.onRespawn();
    expect(clock.t).toBe(0.45); expect(a.pos.y + b.pos.y).toBeCloseTo(8);
    expect(() => new MarketPlatform(stage, 0, 0, 0, { clock, amp: 2.7 })).toThrow();
  });
});

describe('Toaster rhythm', () => {
  it('gives two tells before each pop and respects phase offsets', () => {
    expect(toasterCycle(1.79)).toMatchObject({ tick: 0, cycle: 0 });
    expect(toasterCycle(1.9)).toMatchObject({ tick: 1, cycle: 0 });
    expect(toasterCycle(2.2)).toMatchObject({ tick: 2, cycle: 0 });
    expect(toasterCycle(2.4)).toMatchObject({ tick: 0, cycle: 1 });
    expect(toasterCycle(0, 2.4, 2.2)).toMatchObject({ tick: 2, cycle: 0 });
  });
  it('launches only a grounded rider at the pop, retaining its clock on respawn', () => {
    const stage = stageStub(), toaster = new Toaster(stage, 2, 0, 5);
    stage.game.player.body = { grounded: true, ground: toaster.solid };
    toaster.update(2.35);
    expect(stage.game.player.bounce).not.toHaveBeenCalled();
    toaster.update(0.1);
    expect(stage.game.player.bounce).toHaveBeenCalledWith(15, { allowCut: false });
    toaster.onRespawn();
    expect(toaster.t).toBeCloseTo(2.45);
    stage.game.player.body.grounded = false;
    toaster.update(2.4);
    expect(stage.game.player.bounce).toHaveBeenCalledTimes(1);
  });
});
