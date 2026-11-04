import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { World } from '../src/world/physics.js';
import { drumPos, drumSpeed } from '../src/entities/propsTiming.js';
import { SpinDrum } from '../src/entities/props2.js';

vi.mock('../src/art/assets.js', () => ({ Assets: { tiled: () => null } }));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));

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
