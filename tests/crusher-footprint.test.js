// A crusher at an angle to the world axes crushes only under its own head, not across the
// world-aligned box around it (which reached 2 m in front of the head on Crusher Alley's turn).
import * as THREE from 'three';
import { expect, it, vi } from 'vitest';
vi.mock('../src/art/assets.js', () => ({ Assets: { has: () => false, model: () => null, aspect: () => 1, tex: () => new THREE.Texture(), tiled: () => new THREE.Texture(), url: () => '' } }));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
const { Crusher } = await import('../src/entities/props.js');

const gradient = { addColorStop() {} };
HTMLCanvasElement.prototype.getContext = () => new Proxy({ createRadialGradient: () => gradient, createLinearGradient: () => gradient, measureText: () => ({ width: 10 }) }, { get: (o, k) => (k in o ? o[k] : () => {}) });

it('crushes under the head and not beside it at 45 degrees', () => {
  const stage = { game: { camera: { shake: vi.fn() }, fx: { ring: vi.fn(), sparkle: vi.fn() } }, scene: new THREE.Scene() };
  const yaw = Math.PI / 4, c = new Crusher(stage, 0, 0, 0, { w: 4, d: 2.4, period: 2.6, yaw });
  c.distToPlayer = () => 99;
  c.t = 2.6 * 0.9; c.update(0); expect(c.dangerous).toBe(true);
  const at = (lx, lz) => new THREE.Vector3(Math.cos(yaw) * lx + Math.sin(yaw) * lz, 0, -Math.sin(yaw) * lx + Math.cos(yaw) * lz);
  const p = { pos: at(0, 2.4 / 2 + 1.0), die: vi.fn() };
  // 1 m in front of the head along its short side: inside the world-aligned box, clear of the head
  expect(Math.abs(p.pos.x) < c.size.w / 2 && Math.abs(p.pos.z) < c.size.d / 2).toBe(true);
  c.onTouch(p); expect(p.die).not.toHaveBeenCalled();
  p.pos.copy(at(1.5, 0.5)); c.onTouch(p); expect(p.die).toHaveBeenCalledWith('flat');
});
