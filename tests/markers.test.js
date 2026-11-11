import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { World } from '../src/world/physics.js';
import { Projectiles, makeMarker, MARKER_OPACITY, MARKER_RIM, FEATHER_SCALE } from '../src/bosses/common.js';
import { audio } from '../src/audio/audio.js';

/** Landing markers: a soft shadow plus a thin, unlit gold rim at the hit radius (plan B1/B2). */
function fixture() {
  const player = { pos: new THREE.Vector3(30, 0, 30), vel: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, 1),
    body: { grounded: true, ground: null }, biteT: -1, trap: vi.fn(), cone: vi.fn(), hurt: vi.fn(), bounce: vi.fn() };
  const game = { player, camera: { shake: vi.fn() }, fx: { puff: vi.fn(), smokeCard: vi.fn(), dust: vi.fn(), explosion: vi.fn(), shock: vi.fn(), burst: vi.fn(), ring: vi.fn() } };
  const stage = { game, scene: new THREE.Scene(), world: new World() };
  return { player, game, stage, proj: new Projectiles(game, stage) };
}
const rimOf = (marker) => marker.userData.rim;
/** World-space outer radius of the rim, whatever the shadow's own scale is. */
function rimRadius(marker) {
  marker.updateMatrixWorld(true);
  const rim = rimOf(marker);
  return rim.geometry.parameters.outerRadius * rim.getWorldScale(new THREE.Vector3()).x;
}

beforeEach(() => {
  vi.spyOn(audio, 'play').mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: (o, k) => o[k] ?? (() => {}) }));
});
afterEach(() => vi.restoreAllMocks());

describe('landing marker rim', () => {
  it('every marker has an unlit gold rim that ignores fog and ends at the marker radius', () => {
    const m = makeMarker(1.7), rim = rimOf(m);
    expect(rim.parent).toBe(m);
    expect(rim.material.isMeshBasicMaterial).toBe(true);
    expect(rim.material.color.getHex()).toBe(0xffd23f);
    expect(rim.material.fog).toBe(false); expect(rim.material.depthWrite).toBe(false);
    expect(rim.geometry.parameters.outerRadius).toBeCloseTo(1.7);
    expect(rim.geometry.parameters.innerRadius).toBeCloseTo(1.7 * 0.92);
    expect(rim.material.opacity).toBe(MARKER_RIM.fixed); // dive, pounce and grab markers hold this
    expect(MARKER_RIM.fixed).toBe(0.75);
    expect(m.material.color.getHex()).toBe(0x000000); // the soft shadow stays
    expect(MARKER_OPACITY).toBe(0.5);
  });

  it.each([
    ['dropCone', (p) => p.dropCone(2, 0, 3, 0.9, 1.3), 1.3],
    ['falling crate', (p) => p.falling(2, 3, { delay: 0.9, r: 1 }), 1],
    ['falling leg', (p) => p.falling(2, 3, { kind: 'leg', delay: 0.68, r: 1.2 }), 1.2],
    ['cage', (p) => p.cage(2, 3, { delay: 0.9 }), 1.1],
  ])('%s: the rim is at least 0.35 and at the full hit radius from the first frame, then ramps to 0.9', (_name, make, r) => {
    const { proj, stage } = fixture();
    const pr = make(proj);
    expect(pr.marker.parent).toBe(stage.scene);
    expect(rimOf(pr.marker).material.opacity).toBeGreaterThanOrEqual(0.35);
    expect(rimRadius(pr.marker)).toBeCloseTo(r, 5);
    expect(pr.marker.material.opacity).toBeCloseTo(MARKER_OPACITY * 0.5);
    proj.update(1 / 60);
    expect(rimOf(pr.marker).material.opacity).toBeGreaterThanOrEqual(0.35);
    expect(rimRadius(pr.marker)).toBeCloseTo(r, 5); // the shadow grows, the rim does not
    expect(pr.marker.scale.x).toBeLessThan(0.6);
    const before = rimOf(pr.marker).material.opacity;
    for (let t = 0; t < pr.delay - 0.36; t += 1 / 60) proj.update(1 / 60);
    expect(rimOf(pr.marker).material.opacity).toBeGreaterThan(before);
    expect(rimOf(pr.marker).material.opacity).toBeLessThanOrEqual(0.9);
    expect(rimRadius(pr.marker)).toBeCloseTo(r, 5);
    expect(pr.r).toBe(r); // the hit radius itself is unchanged
  });

  it('egg bomb: the rim shows once the egg has landed and ramps with the fuse', () => {
    const { proj } = fixture();
    const pr = proj.eggBomb(new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(0, 0, 0), { fuse: 2, radius: 2.2 });
    expect(rimOf(pr.marker)).toBeTruthy();
    expect(pr.marker.visible).toBe(false);
    for (let i = 0; i < 30 && !pr.marker.visible; i++) proj.update(1 / 60);
    expect(pr.marker.visible).toBe(true);
    const first = rimOf(pr.marker).material.opacity;
    expect(first).toBeGreaterThanOrEqual(0.35);
    expect(rimRadius(pr.marker)).toBeCloseTo(2.2, 5);
    for (let i = 0; i < 60; i++) proj.update(1 / 60);
    expect(rimOf(pr.marker).material.opacity).toBeGreaterThan(first);
  });

  it('feathers are drawn 1.6x larger with the same hit radius', () => {
    const { proj } = fixture();
    const pr = proj.feather(new THREE.Vector3(0, 1, 0), new THREE.Vector3(0, 0, 1), 11);
    expect(FEATHER_SCALE).toBe(1.6);
    expect(pr.mesh.scale.x).toBe(1.6);
    expect(pr.r).toBe(0.45);
  });
});
