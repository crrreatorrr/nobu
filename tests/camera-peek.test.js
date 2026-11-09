import * as THREE from 'three';
import { expect, test } from 'vitest';
import { GameCamera, PEEK, stepPeek } from '../src/camera/camera.js';

function player(x = 0, z = 0) {
  return { pos: new THREE.Vector3(x, 0, z), body: { grounded: true, s: 0, u: 0 } };
}

test('peek eases toward the stick at a frame-rate independent speed and returns when released', () => {
  const a = { yaw: 0, pitch: 0 }, b = { yaw: 0, pitch: 0 };
  stepPeek(a, [1, 0], 0.1);
  stepPeek(b, [1, 0], 0.05); stepPeek(b, [1, 0], 0.05);
  expect(a.yaw).toBeCloseTo(b.yaw, 10);
  for (let i = 0; i < 120; i++) stepPeek(a, [1, 1], 1 / 60);
  expect(a.yaw).toBeCloseTo(PEEK.yaw, 3);
  expect(a.pitch).toBeCloseTo(PEEK.down, 3);
  for (let i = 0; i < 240; i++) stepPeek(a, null, 1 / 60);
  expect(a).toEqual({ yaw: 0, pitch: 0 });
});

test('stick right turns the view right; stick up looks up (not inverted)', () => {
  const cam = new GameCamera(1);
  const p = player();
  cam.snap(p);
  const before = cam.cam.getWorldDirection(new THREE.Vector3());
  const right = cam.basis.right.clone();
  cam.peekInput = [1, 0];
  for (let i = 0; i < 60; i++) cam.update(1 / 60, p);
  const after = cam.cam.getWorldDirection(new THREE.Vector3());
  expect(after.dot(right)).toBeGreaterThan(before.dot(right) + 0.2);

  const up = new GameCamera(1);
  up.snap(p);
  const y0 = up.cam.getWorldDirection(new THREE.Vector3()).y;
  up.peekInput = [0, -1];
  for (let i = 0; i < 60; i++) up.update(1 / 60, p);
  expect(up.cam.getWorldDirection(new THREE.Vector3()).y).toBeGreaterThan(y0);
});

test('peeking never changes the movement basis, and cinematics or snaps cancel it', () => {
  const still = new GameCamera(1), peek = new GameCamera(1);
  const p = player();
  still.snap(p); peek.snap(p);
  peek.peekInput = [-1, 1];
  for (let i = 0; i < 30; i++) { still.update(1 / 60, p); peek.update(1 / 60, p); }
  expect(peek.basis.forward.distanceTo(still.basis.forward)).toBeLessThan(1e-9);
  expect(peek.basis.right.distanceTo(still.basis.right)).toBeLessThan(1e-9);
  expect(peek.basis.toCamera).toBeCloseTo(still.basis.toCamera, 9);
  expect(peek.cam.position.distanceTo(still.cam.position)).toBeGreaterThan(1);

  peek.cinematic(new THREE.Vector3(0, 3, 9), new THREE.Vector3(0, 1, 0));
  for (let i = 0; i < 120; i++) peek.update(1 / 60, p);
  expect(peek.peek.yaw).toBeCloseTo(0, 3);
  peek.endCinematic();
  peek.update(1 / 60, p);
  expect(Math.abs(peek.peek.yaw)).toBeGreaterThan(0);
  peek.snap(p);
  expect(peek.peek).toEqual({ yaw: 0, pitch: 0 });
});
