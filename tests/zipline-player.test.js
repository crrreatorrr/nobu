import { expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Player, TUNING } from '../src/player/player.js';
import { input } from '../src/core/input.js';

vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));

it('routes Player.update through hang movement, projects checkpoints and skips ordinary physics', () => {
  const p = Object.create(Player.prototype);
  Object.assign(p, {
    game: {}, mode: 'normal', pos: new THREE.Vector3(), vel: new THREE.Vector3(), body: {},
    biteCooldown: 0, invulnT: 0, jumpBuffer: 0, coyote: 0, landT: 0, jumpT: 0, flipT: -1,
    _hangProjection: {}, _interact: vi.fn(), _animate: vi.fn(), _updateShadow: vi.fn(),
    hang: { t: 0, line: { A: new THREE.Vector3(0, 4, 0), B: new THREE.Vector3(0, 6, -10), speed: 9, length: Math.sqrt(104), velocity: new THREE.Vector3(0, 18 / Math.sqrt(104), -90 / Math.sqrt(104)) } },
  });
  const stage = { track: { project: vi.fn((x, z, hint, out) => Object.assign(out, { s: -z, u: x, i: 2 })) } };
  vi.spyOn(input, 'pressed').mockReturnValue(false);
  p.update(0.1, stage, { right: { x: 1, z: 0 }, forward: { x: 0, z: -1 } });
  expect(p.pos.z).toBeLessThan(0); expect(p.pos.y).toBeGreaterThan(2.75);
  expect(p.body.s).toBeCloseTo(-p.pos.z); expect(p.body.trackHint).toBe(2);
  expect(p._interact).toHaveBeenCalledWith(stage);
  expect(p._animate).toHaveBeenCalledOnce();
  // Jump from the actual Player input path retains line momentum and restores the double jump.
  input.pressed.mockImplementation(action => action === 'jump');
  p.update(0.1, stage, { right: { x: 1, z: 0 }, forward: { x: 0, z: -1 } });
  expect(p.hang).toBeNull(); expect(p.canDouble).toBe(true);
  expect(p.vel.y).toBeGreaterThan(TUNING.JUMP * 0.85);
  vi.restoreAllMocks();
});

it('releases a hanging player before applying the normal mask hit', () => {
  const p = Object.create(Player.prototype), setMask = vi.fn();
  Object.assign(p, { mode: 'normal', hang: { line: {} }, invulnT: 0, body: { grounded: false }, pos: new THREE.Vector3(), vel: new THREE.Vector3(),
    game: { session: { mask: 1, setMask }, camera: { shake: vi.fn() } } });
  expect(p.hurt('flat', 1, 0)).toBe(true);
  expect(p.hang).toBeNull(); expect(setMask).toHaveBeenCalledWith(0);
  expect(p.invulnT).toBe(1.7); expect(p.vel.x).toBeLessThan(0);
});
