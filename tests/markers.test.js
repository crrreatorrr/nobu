import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { World } from '../src/world/physics.js';
import { Projectiles, makeMarker, MARKER_OPACITY, MARKER_RIM, FEATHER_SCALE } from '../src/bosses/common.js';
import { audio } from '../src/audio/audio.js';

/** Landing markers: a soft shadow under an unlit gold ring that ends at the hit radius (plan B1/B2 and the F1 follow-up). */
function fixture() {
  const player = { pos: new THREE.Vector3(30, 0, 30), vel: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, 1),
    body: { grounded: true, ground: null }, biteT: -1, trap: vi.fn(), cone: vi.fn(), hurt: vi.fn(), bounce: vi.fn() };
  const game = { player, camera: { shake: vi.fn() }, fx: { puff: vi.fn(), smokeCard: vi.fn(), dust: vi.fn(), explosion: vi.fn(), shock: vi.fn(), burst: vi.fn(), ring: vi.fn() } };
  const stage = { game, scene: new THREE.Scene(), world: new World() };
  return { player, game, stage, proj: new Projectiles(game, stage) };
}
const rimOf = (marker) => marker.userData.rim;
/** World-space outer radius of the ring, whatever the shadow's own scale is. */
function rimRadius(marker) {
  marker.updateMatrixWorld(true);
  const rim = rimOf(marker);
  return rim.userData.radius * rim.getWorldScale(new THREE.Vector3()).x;
}

beforeEach(() => {
  vi.spyOn(audio, 'play').mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: (o, k) => o[k] ?? (() => {}) }));
});
afterEach(() => vi.restoreAllMocks());

describe('landing marker rim', () => {
  it('every marker has an unlit gold ring that ignores fog and ends at the marker radius', () => {
    const m = makeMarker(1.7), rim = rimOf(m);
    expect(rim.parent).toBe(m);
    expect(rim.material.isShaderMaterial).toBe(true); // unlit: it reads on a darkened floor
    expect(rim.material.lights).toBe(false);
    expect(rim.material.uniforms.uColor.value.getHex()).toBe(0xffd23f);
    expect(rim.material.fog).toBe(false); expect(rim.material.depthWrite).toBe(false);
    expect(rimRadius(m)).toBeCloseTo(1.7);
    expect(m.userData.radius).toBe(1.7);
    expect(rim.material.opacity).toBe(MARKER_RIM.fixed); // dive, pounce and grab markers hold this
    expect(MARKER_RIM.fixed).toBeGreaterThanOrEqual(0.9);
    expect(rim.userData.clockFill).toBe(true); // and beat steadily until a countdown drives them
    expect(m.material.color.getHex()).toBe(0x000000); // the soft shadow stays
    expect(MARKER_OPACITY).toBe(0.5);
  });

  it.each([
    ['dropCone', (p) => p.dropCone(2, 0, 3, 0.9, 1.3), 1.3],
    ['falling crate', (p) => p.falling(2, 3, { delay: 0.9, r: 1 }), 1],
    ['falling leg', (p) => p.falling(2, 3, { kind: 'leg', delay: 0.68, r: 1.2 }), 1.2],
    ['cage', (p) => p.cage(2, 3, { delay: 0.9 }), 1.1],
  ])('%s: the ring is bold and at the full hit radius from the first frame, then ramps to full', (_name, make, r) => {
    const { proj, stage } = fixture();
    const pr = make(proj);
    expect(pr.marker.parent).toBe(stage.scene);
    expect(rimOf(pr.marker).material.opacity).toBeGreaterThanOrEqual(0.75);
    expect(rimRadius(pr.marker)).toBeCloseTo(r, 5);
    expect(pr.marker.material.opacity).toBeCloseTo(MARKER_OPACITY * 0.5);
    proj.update(1 / 60);
    expect(rimOf(pr.marker).material.opacity).toBeGreaterThanOrEqual(0.75);
    expect(rimRadius(pr.marker)).toBeCloseTo(r, 5); // the shadow grows, the ring does not
    expect(pr.marker.scale.x).toBeLessThan(0.6);
    const before = rimOf(pr.marker).material.opacity;
    for (let t = 0; t < pr.delay - 0.36; t += 1 / 60) proj.update(1 / 60);
    expect(rimOf(pr.marker).material.opacity).toBeGreaterThan(before);
    expect(rimOf(pr.marker).material.opacity).toBeLessThanOrEqual(1);
    expect(rimRadius(pr.marker)).toBeCloseTo(r, 5);
    expect(pr.r).toBe(r); // the hit radius itself is unchanged
    expect(pr.delay).toBeGreaterThanOrEqual(0.4); // and so is the tell
  });

  it('the fill inside the ring beats, and harder as the impact nears', () => {
    const { proj } = fixture();
    const pr = proj.dropCone(0, 0, 0, 1.2, 1.4), rim = rimOf(pr.marker);
    expect(rim.userData.clockFill).toBe(false);
    const fills = [];
    for (let t = 0; t < 1.2; t += 1 / 60) { proj.update(1 / 60); fills.push(rim.userData.fill); }
    const early = fills.slice(0, 24), late = fills.slice(-24);
    expect(Math.max(...late)).toBeGreaterThan(Math.max(...early) * 1.5);
    expect(Math.min(...fills)).toBeGreaterThan(0);
    expect(Math.max(...fills)).toBeLessThan(0.5); // a tint, never a solid disc over the floor
    let turns = 0;
    for (let i = 2; i < fills.length; i++) if ((fills[i] - fills[i - 1]) * (fills[i - 1] - fills[i - 2]) < 0) turns++;
    expect(turns).toBeGreaterThanOrEqual(6); // it pulses rather than only fading in
  });

  it('egg bomb: the ring shows once the egg has landed and ramps with the fuse', () => {
    const { proj } = fixture();
    const pr = proj.eggBomb(new THREE.Vector3(0, 0.6, 0), new THREE.Vector3(0, 0, 0), { fuse: 2, radius: 2.2 });
    expect(rimOf(pr.marker)).toBeTruthy();
    expect(pr.marker.visible).toBe(false);
    for (let i = 0; i < 30 && !pr.marker.visible; i++) proj.update(1 / 60);
    expect(pr.marker.visible).toBe(true);
    const first = rimOf(pr.marker).material.opacity;
    expect(first).toBeGreaterThanOrEqual(0.75);
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
