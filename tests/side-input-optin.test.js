import * as THREE from 'three';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { Player } from '../src/player/player.js';
import { World } from '../src/world/physics.js';
import { input } from '../src/core/input.js';
import { save } from '../src/core/save.js';

function fixture(sideAxis, ignoreDepth) {
  const noop = () => {};
  const game = { camera: { sideAxis, opts: { ignoreDepth } }, loadout: { effects: {}, cosmeticSlots: () => ({}) }, session: {}, ui: { setConed: noop } };
  const player = Object.create(Player.prototype);
  Object.assign(player, { game, pos: new THREE.Vector3(), vel: new THREE.Vector3(), root: new THREE.Group(), model: {}, wings: {}, halo: {}, stars: {}, deathCone: { position: new THREE.Vector3() }, _animate: noop, _updateShadow: noop });
  player.body = { pos: player.pos, vel: player.vel, h: 1.3, hw: .3, hd: .3 };
  const stage = { game, world: new World(), entities: [], killYAt: () => -20 };
  game.stage = stage; player.reset(); player.body.grounded = true;
  player.body.ground = stage.world.addBox(0, -1, 0, 80, 1, 80);
  return { player, stage };
}
beforeEach(() => { save.reset(); vi.spyOn(input, 'pressed').mockReturnValue(false); vi.spyOn(input, 'held').mockReturnValue(false); input.state.x = 0; input.state.y = 1; });
afterEach(() => { vi.restoreAllMocks(); input.state.x = input.state.y = 0; });
it('ignores depth only in an opted-in side camera, while preserving legacy half-speed depth and non-side input', () => {
  const basis = { right: { x: 1, z: 0 }, forward: { x: 0, z: 1 } };
  for (const [side, ignore, expected] of [[true, true, 0], [true, false, .4], [false, true, .8]]) {
    const { player, stage } = fixture(side, ignore); player.update(.1, stage, basis);
    expect(player.pos.z).toBeCloseTo(expected); expect(player.pos.x).toBe(0);
  }
  const { player, stage } = fixture(true, true); input.state.x = 1; player.update(.1, stage, basis);
  expect(player.pos.x).toBeCloseTo(.8); expect(player.pos.z).toBe(0);
});
