import { afterEach, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { Stage, THEMES } from '../src/world/stage.js';
import { Assets } from '../src/art/assets.js';
afterEach(() => vi.restoreAllMocks());
it('tints river ground in both mesh paths without tinting walls or shared textures', () => {
  const texture = new THREE.Texture();
  vi.spyOn(Assets, 'tiled').mockReturnValue(texture);
  const buildMeshes = vi.fn();
  const s = Object.assign(Object.create(Stage.prototype), {
    theme: THEMES.river, scene: new THREE.Scene(), blocks: [], decorParts: [], track: { buildMeshes },
  });
  s.block(-1, -1, -1, 1, 0, 1, 'ground', { solid: false });
  s.finalize();
  const trackMaterials = buildMeshes.mock.calls[0][1];
  expect(trackMaterials.ground.color.getHex()).toBe(0x9a9a7a);
  expect(trackMaterials.wall.color.getHex()).toBe(0xffffff);
  expect(s.scene.children[0].material.color.getHex()).toBe(0x9a9a7a);
  expect(trackMaterials.ground.map).toBe(texture);
  expect(trackMaterials.wall.map).toBe(texture);
  for (const material of Object.values(trackMaterials)) material.dispose();
  s.scene.traverse(o => { o.geometry?.dispose(); o.material?.dispose(); });
});
it('keeps the default ground tint white in existing themes', () => {
  vi.spyOn(Assets, 'tiled').mockReturnValue(new THREE.Texture());
  const buildMeshes = vi.fn();
  const s = Object.assign(Object.create(Stage.prototype), {
    theme: THEMES[1], scene: new THREE.Scene(), blocks: [], decorParts: [], track: { buildMeshes },
  });
  s.finalize();
  expect(buildMeshes.mock.calls[0][1].ground.color.getHex()).toBe(0xffffff);
  for (const m of Object.values(buildMeshes.mock.calls[0][1])) m.dispose();
});
it('drifts river smog downstream at 0.4 m/s and keeps ordinary pollen unchanged', () => {
  const smokeCard = vi.fn(), sparkle = vi.fn();
  const s = Object.assign(Object.create(Stage.prototype), {
    game: { fx: { smokeCard, sparkle } }, themeKey: 'river',
    track: { tangent: () => new THREE.Vector3(3, 2, -4) },
  });
  const p = { pos: new THREE.Vector3(), body: { s: 10 } };
  s._ambient(.07, p);
  const opts = smokeCard.mock.calls[0][3];
  expect(Math.hypot(opts.vx, opts.vz)).toBeCloseTo(.4);
  expect(opts.vx).toBeCloseTo(.24); expect(opts.vz).toBeCloseTo(-.32);
  expect(opts.size).toBeCloseTo(.224); expect(opts.colors).toEqual([0x9a8aa8]);
  s._ambient(.01, p); expect(smokeCard).toHaveBeenCalledOnce();
  s.themeKey = 1; s._ambient(.07, p);
  expect(sparkle).toHaveBeenCalledOnce();
});
