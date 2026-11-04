import { expect, it } from 'vitest';
import { World, rideGround } from '../src/world/physics.js';

it('does not carry a grounded body when a stationary platform changes horizontal bounds', () => {
  const world = new World(), solid = world.addBox(5, 2, -8, 4, .5, 2, { kind: 'moving' });
  const body = { pos: { x: 5, y: 2.5, z: -8 }, grounded: true, ground: solid };
  world.beginFrame(); solid.setCenter(5, 2, -8, 2, .5, 4); rideGround(body);
  expect(solid.delta).toEqual({ x: 0, y: 0, z: 0 });
  expect(body.pos).toEqual({ x: 5, y: 2.5, z: -8 });
});
it('preserves constant-size translation, bottom-based y and accumulated calls', () => {
  const world = new World(), solid = world.addBox(5, 2, -8, 4, .5, 2, { kind: 'moving' });
  world.beginFrame(); solid.setCenter(6, 3, -6, 4, .5, 2); solid.setCenter(7, 4, -5, 4, 2, 2);
  expect(solid.delta).toEqual({ x: 2, y: 2, z: 3 });
  const body = { pos: { x: 5, y: 2.5, z: -8 }, grounded: true, ground: solid };
  rideGround(body); expect(body.pos).toEqual({ x: 7, y: 4.5, z: -5 });
});
it('reflects real carry vectors while rotating bounds change size', () => {
  const world = new World();
  const a = world.addBox(3, 2, -8, 4, .5, 2, { kind: 'moving' });
  const b = world.addBox(7, 2, -8, 4, .5, 2, { kind: 'moving' });
  const pa = { pos: { x: 3, y: 2.5, z: -8 }, grounded: true, ground: a };
  const pb = { pos: { x: 7, y: 2.5, z: -8 }, grounded: true, ground: b };
  for (let i = 1; i <= 20; i++) {
    world.beginFrame(); const x = 3 + i * .12, z = -8 + i * .17, w = 2 + Math.sin(i / 3);
    a.setCenter(x, 2, z, w, .5, 4 - w); b.setCenter(10 - x, 2, z, w, .5, 4 - w);
    rideGround(pa); rideGround(pb);
    expect(pb.pos.x).toBeCloseTo(10 - pa.pos.x, 12); expect(pb.pos.z).toBeCloseTo(pa.pos.z, 12);
    expect(b.delta.x).toBeCloseTo(-a.delta.x, 12); expect(b.delta.z).toBeCloseTo(a.delta.z, 12);
  }
});
