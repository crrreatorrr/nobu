import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCamera } from '../src/camera/camera.js';
import { ARENA_CAMERAS, arenaCamera } from '../src/levels/arenaCameras.js';
import { Projectiles, Beam, BEAM_AIM, makeMarker, FEATHER_SCALE, MISSILE_SCALE, CONE_SCALE } from '../src/bosses/common.js';
import { READ, ringPixels, ringWorldWidth, pixelsBetween, sizeRing, markerFill, steadyFill, makeGroundRing, makeNobuRing, placeNobuRing, makeFloorPath, setFloorPath, styleLane } from '../src/bosses/readability.js';
import { World } from '../src/world/physics.js';
import { FLOOR } from '../src/config/difficulty.js';
import { audio } from '../src/audio/audio.js';

/**
 * Pixel minimums for boss threats from the far arena cameras (plan F1–F3 follow-up). Everything is
 * measured with the real arena cameras at their authored lens, which is the widest a fight normally
 * gets, at 960x540: a landing ring's band is at least 3 px all the way round, wherever it is on the
 * floor, and no projectile is a sliver.
 */
const ARENAS = Object.keys(ARENA_CAMERAS);
const MARKER_RADII = [1, 1.1, 1.2, 1.3, 1.4, 1.7, 1.9, 2.2, 2.4]; // every radius the five bosses use

function arenaCam(key, [vw, vh], px = 0, pz = 0) {
  const camera = new GameCamera(vw / vh);
  const opts = arenaCamera(key); delete opts.fit;
  camera.setMode('arena', opts);
  camera.cam.fov = ARENA_CAMERAS[key].fov; camera.cam.updateProjectionMatrix();
  camera.snap({ pos: new THREE.Vector3(px, 0, pz), body: { grounded: true } });
  camera.cam.updateMatrixWorld();
  return camera.cam;
}
/** Thinnest and thickest pixel width of a ring's band, sampled every 15 degrees. */
function bandPixels(cam, viewH, centre, radius, width) {
  let min = Infinity, max = 0;
  for (let i = 0; i < 24; i++) {
    const a = i / 24 * Math.PI * 2, dx = Math.cos(a), dz = Math.sin(a);
    const px = pixelsBetween(cam, viewH, new THREE.Vector3(centre.x + dx * radius, centre.y, centre.z + dz * radius),
      new THREE.Vector3(centre.x + dx * (radius - width), centre.y, centre.z + dz * (radius - width)));
    min = Math.min(min, px); max = Math.max(max, px);
  }
  return { min, max };
}
/** Floor positions across an arena: centre, edges, corners and points between. */
function floorSpots(half) {
  const out = [];
  for (const x of [-1, -0.5, 0, 0.5, 1]) for (const z of [-1, -0.5, 0, 0.5, 1]) out.push(new THREE.Vector3(x * (half - 1), 0.05, z * (half - 1)));
  return out;
}

beforeEach(() => {
  vi.spyOn(audio, 'play').mockImplementation(() => {});
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: (o, k) => o[k] ?? (() => ({ addColorStop() {} })) }));
});
afterEach(() => vi.restoreAllMocks());

describe('landing ring width in pixels', () => {
  it('the target is 4.5 px at 540p, grows with the viewport and is never under 3 px', () => {
    expect(ringPixels(540)).toBe(4.5);
    expect(ringPixels(720)).toBeCloseTo(6);
    expect(ringPixels(1080)).toBeCloseTo(9);
    expect(ringPixels(300)).toBe(3);
    expect(READ.marker.minPx).toBe(3);
  });

  it.each(ARENAS)('%s arena at 960x540: every marker radius, anywhere on the floor, wherever Nobu stands, is at least 3 px all the way round', (key) => {
    const half = ARENA_CAMERAS[key].half;
    let thinnest = Infinity;
    for (const [px, pz] of [[0, 0], [0, half - 1], [0, -half + 1], [half - 1, half - 1], [-half + 1, -half + 1]]) {
      const cam = arenaCam(key, [960, 540], px, pz);
      for (const spot of floorSpots(half)) for (const r of MARKER_RADII) {
        const w = ringWorldWidth(cam, 540, spot, r, ringPixels(540));
        expect(w).toBeLessThanOrEqual(r * READ.marker.maxFrac + 1e-9); // the ring never swallows the marker
        thinnest = Math.min(thinnest, bandPixels(cam, 540, spot, r, w).min);
      }
    }
    expect(thinnest).toBeGreaterThanOrEqual(3);
  });

  it.each([[960, 540], [1280, 720], [1024, 768]])('at %ix%i the band meets its pixel target on every arena (the old ring was about 1 px)', (vw, vh) => {
    for (const key of ARENAS) {
      const cam = arenaCam(key, [vw, vh]);
      for (const spot of floorSpots(ARENA_CAMERAS[key].half)) {
        const w = ringWorldWidth(cam, vh, spot, 1.4, ringPixels(vh));
        const band = bandPixels(cam, vh, spot, 1.4, w);
        if (w < 1.4 * READ.marker.maxFrac - 1e-6) expect(band.min).toBeGreaterThanOrEqual(ringPixels(vh) - 0.05);
        expect(band.min).toBeGreaterThanOrEqual(3);
        const old = bandPixels(cam, vh, spot, 1.4, 1.4 * 0.08);
        expect(band.min).toBeGreaterThanOrEqual(old.min); // and far from the camera, where the old one was about 1 px, several times it
      }
    }
  });

  it('a real marker is sized for the camera that draws it, on its world radius, and close up it keeps a floor width', () => {
    const scene = new THREE.Scene();
    const m = makeMarker(1.4); m.position.set(3, 0.05, -6); m.scale.setScalar(0.5); scene.add(m);
    const rim = m.userData.rim; rim.scale.setScalar(1.4 / 0.5); // as setMarkerRim does for a falling object
    scene.updateMatrixWorld(true);
    const cam = arenaCam('bird', [960, 540]);
    const w = sizeRing(rim, cam, 540);
    expect(rim.userData.ringWorld).toBe(w);
    expect(bandPixels(cam, 540, new THREE.Vector3(3, 0.05, -6), 1.4, w).min).toBeGreaterThanOrEqual(4.45);
    expect(rim.material.uniforms.uInner.value).toBeCloseTo(1 - w / 1.4, 6);
    expect(rim.material.uniforms.uOpacity.value).toBe(rim.material.opacity);
    const near = new THREE.PerspectiveCamera(58, 16 / 9, 0.1, 100);
    near.position.set(3, 3, -3); near.lookAt(3, 0, -6); near.updateMatrixWorld();
    expect(sizeRing(rim, near, 540)).toBeCloseTo(1.4 * READ.marker.minFrac, 6);
  });

  it('the fill is a beat, not a clock: it has no number, rises with k and stays a tint', () => {
    let peakEarly = 0, peakLate = 0;
    for (let k = 0; k <= 1; k += 0.005) {
      const f = markerFill(k);
      expect(f).toBeGreaterThan(0); expect(f).toBeLessThan(0.45);
      if (k < 0.3) peakEarly = Math.max(peakEarly, f); if (k > 0.7) peakLate = Math.max(peakLate, f);
    }
    expect(peakLate).toBeGreaterThan(peakEarly * 1.5);
    expect(markerFill(-1)).toBe(markerFill(0)); expect(markerFill(2)).toBe(markerFill(1));
    for (let t = 0; t < 2; t += 0.01) { expect(steadyFill(t)).toBeGreaterThanOrEqual(0.1 - 1e-9); expect(steadyFill(t)).toBeLessThanOrEqual(0.3 + 1e-9); }
  });
});

describe('projectiles read from the arena camera', () => {
  function fixture() {
    const player = { pos: new THREE.Vector3(30, 0, 30), vel: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, 1),
      body: { grounded: true }, biteT: -1, trap: vi.fn(), cone: vi.fn(), hurt: vi.fn(), bounce: vi.fn() };
    const game = { player, camera: { shake: vi.fn() }, fx: new Proxy({}, { get: () => () => {} }) };
    const world = new World();
    world.groundBelow = () => 0; // a flat arena floor
    const stage = { game, scene: new THREE.Scene(), world };
    return { player, stage, proj: new Projectiles(game, stage) };
  }
  /** Width and height in pixels of everything drawn for a projectile (its own shapes and its outline). */
  function screenSize(cam, viewH, mesh) {
    mesh.updateMatrixWorld(true);
    let l = Infinity, r = -Infinity, t = Infinity, b = -Infinity;
    const v = new THREE.Vector3();
    mesh.traverse((o) => {
      if (!o.isMesh || o === mesh.userData.groundLine) return;
      if (!o.geometry.boundingBox) o.geometry.computeBoundingBox();
      const g = o.geometry.boundingBox;
      for (const x of [g.min.x, g.max.x]) for (const y of [g.min.y, g.max.y]) for (const z of [g.min.z, g.max.z]) {
        v.set(x, y, z).applyMatrix4(o.matrixWorld).project(cam);
        l = Math.min(l, v.x); r = Math.max(r, v.x); t = Math.min(t, v.y); b = Math.max(b, v.y);
      }
    });
    return { w: (r - l) / 2 * viewH * cam.aspect, h: (b - t) / 2 * viewH };
  }
  const FWD = new THREE.Vector3(0, 0, 1), SIDE = new THREE.Vector3(1, 0, 0);
  // [kind, arena it is fired in, maker, least pixels of its smaller side at 960x540, hit radius]
  const SHOTS = [
    ['feather', 'bird', (p, at, dir) => p.feather(at, dir, 11), 13, 0.45],
    ['cone', 'cone', (p, at, dir) => p.cone(at, dir, 9.5), 12, 0.5],
    ['hairball', 'cat', (p, at, dir) => p.hairball(at, dir, 7, 0), 15, 0.5],
    ['missile', 'bird', (p, at, dir) => p.missile(at, dir, {}), 9, 0.42],
    ['slow homer', 'cone', (p, at, dir) => p.slowHomer(at, { dir }), 9, 0.32],
    ['debris', 'titan', (p, at, dir) => p.debris(at, dir, 10), 6, 0.5],
    ['egg', 'bird', (p, at) => p.eggBomb(at, new THREE.Vector3(), { groundY: 0 }), 15, 0.5],
  ];

  it.each(SHOTS)('%s: outlined, with a shadow ring on the floor the size of its hit radius, and never a sliver', (_kind, arena, make, minPx, r) => {
    const half = ARENA_CAMERAS[arena].half, cam = arenaCam(arena, [960, 540]);
    let smallest = Infinity;
    for (const spot of floorSpots(half)) for (const dir of [FWD, SIDE]) {
      const { proj, stage } = fixture();
      const pr = make(proj, new THREE.Vector3(spot.x, 1.05, spot.z), dir);
      expect(pr.r).toBe(r); // drawn bigger, hit exactly as before
      expect(pr.mesh.userData.outline?.material.side).toBe(THREE.BackSide);
      expect(pr.mesh.userData.outline.material.fog).toBe(false);
      expect(pr.shadow.parent).toBe(stage.scene);
      expect(pr.shadow.scale.x).toBe(r);
      expect(pr.shadow.position.y).toBeCloseTo(0.04);
      const s = screenSize(cam, 540, pr.mesh);
      smallest = Math.min(smallest, s.w, s.h);
      // the shadow's pale edge is at least 2 px
      stage.scene.updateMatrixWorld(true);
      const w = sizeRing(pr.shadow, cam, 540);
      expect(bandPixels(cam, 540, pr.shadow.position, r, w).min).toBeGreaterThanOrEqual(Math.min(2, bandPixels(cam, 540, pr.shadow.position, r, r * READ.shadow.maxFrac).min) - 1e-6);
      proj.update(1 / 60);
      expect(pr.shadow.position.x).toBeCloseTo(pr.mesh.position.x, 6); expect(pr.shadow.position.z).toBeCloseTo(pr.mesh.position.z, 6);
      proj.clear();
      expect(pr.shadow.parent).toBe(null);
    }
    expect(smallest).toBeGreaterThanOrEqual(minPx);
  });

  it('feathers are at least twice as wide on screen as the 0.16 m slivers they were', () => {
    const cam = arenaCam('bird', [960, 540]);
    const { proj } = fixture();
    const pr = proj.feather(new THREE.Vector3(0, 1.05, -11), SIDE, 11); // side-on at the far edge: its thin axis faces the camera
    const s = screenSize(cam, 540, pr.mesh);
    const old = pixelsBetween(cam, 540, new THREE.Vector3(0, 1.05 - 0.16 * 1.6, -11), new THREE.Vector3(0, 1.05 + 0.16 * 1.6, -11));
    expect(Math.min(s.w, s.h)).toBeGreaterThan(old * 1.8);
    expect(0.31 * FEATHER_SCALE).toBeLessThan(0.45 + 0.38); // still inside what actually hits (radius + Nobu's)
    expect(MISSILE_SCALE).toBeGreaterThan(1); expect(CONE_SCALE).toBeGreaterThan(1);
  });

  it('without a floor under it (a pit) a shot simply has no shadow', () => {
    const { proj, stage } = fixture();
    stage.world.groundBelow = () => -Infinity;
    expect(proj.feather(new THREE.Vector3(0, 1, 0), FWD).shadow).toBeUndefined();
  });

  it('an egg hands over from its shadow to its blast marker when it lands', () => {
    const { proj } = fixture();
    const pr = proj.eggBomb(new THREE.Vector3(0, 3, 0), new THREE.Vector3(), { groundY: 0 });
    proj.update(1 / 60);
    expect(pr.shadow.visible).toBe(true); expect(pr.marker.visible).toBe(false);
    for (let i = 0; i < 90 && !pr.landed; i++) proj.update(1 / 60);
    proj.update(1 / 60);
    expect(pr.shadow.visible).toBe(false); expect(pr.marker.visible).toBe(true);
  });

  it('floor-skimming and floor-level threats have a dark edge: claw slashes, scratches, shockwaves, rollers, cables', () => {
    const { proj } = fixture();
    const claw = proj.clawWave(new THREE.Vector3(0, 0, 0), FWD, { groundY: 0 });
    expect(claw.mesh.userData.groundLine.getWorldPosition(new THREE.Vector3()).y).toBeCloseTo(0.04);
    expect(proj.scratch(new THREE.Vector3(0, 0, 0), new THREE.Vector3(3, 0, 0)).mesh.userData.outline).toBeTruthy();
    expect(proj.shockwave(0, 0, 0).mesh.userData.outline).toBeTruthy();
    expect(proj.roller(new THREE.Vector3(0, 0, 0), FWD).spin.userData.outline).toBeTruthy();
    const cable = proj.cableArc(new THREE.Vector3(0, 0, -12), 14, -1, 1);
    expect(cable.mesh.material.isMeshBasicMaterial).toBe(true); // unlit: it shows in Lights Out
    expect(cable.mesh.userData.outline).toBeTruthy();
  });

  it('a laser is a visible line while it aims, with a ring at the edge of the spot it burns', () => {
    const scene = new THREE.Scene(), beam = new Beam(scene, 0xff3040);
    beam.set(new THREE.Vector3(0, 4, -10), new THREE.Vector3(2, 0, 3), false, 0.1);
    expect(beam.glow.scale.x).toBe(BEAM_AIM.glow); expect(beam.core.scale.x).toBe(BEAM_AIM.core);
    for (const key of ['bird', 'cone']) {
      const cam = arenaCam(key, [960, 540]), far = -ARENA_CAMERAS[key].half;
      const px = pixelsBetween(cam, 540, new THREE.Vector3(-BEAM_AIM.glow, 0.5, far), new THREE.Vector3(BEAM_AIM.glow, 0.5, far));
      expect(px).toBeGreaterThanOrEqual(3); // at the far edge of the floor; it was 1.2 px
    }
    expect(beam.ring.scale.x).toBe(0.75); // Beam.hits() default radius
    expect(beam.ring.position.x).toBe(2); expect(beam.ring.position.z).toBe(3);
    expect(new Beam(scene, 0x4aff8a, { ring: false }).ring).toBe(null);
    expect(beam.hits({ pos: new THREE.Vector3(2.7, 0, 3) })).toBe(true);
    expect(beam.hits({ pos: new THREE.Vector3(2.8, 0, 3) })).toBe(false);
  });

  it('a floor path runs from one point to the other at the width asked for', () => {
    const path = makeFloorPath(0xff3040);
    expect(path.visible).toBe(false);
    setFloorPath(path, new THREE.Vector3(-8, 0, 2), new THREE.Vector3(8, 0, 2), 1.5, 0.6);
    expect(path.visible).toBe(true);
    path.updateMatrixWorld(true);
    const end = new THREE.Vector3(0, 0, 1).applyMatrix4(path.matrixWorld), side = new THREE.Vector3(0.5, 0, 0).applyMatrix4(path.matrixWorld);
    expect(end.x).toBeCloseTo(8); expect(end.z).toBeCloseTo(2);
    expect(Math.abs(side.z - 2)).toBeCloseTo(0.75);
    expect(styleLane(path).material.map).toBeTruthy();
  });

  it('tells are not shortened: the floor is still 0.40 s', () => {
    const { proj } = fixture();
    expect(FLOOR.teleSec).toBe(0.4);
    expect(proj.falling(0, 0, { delay: 0.1 }).delay).toBe(0.4);
  });
});

describe('Nobu in the arena', () => {
  it('has a cyan ring on the floor under him, at least 2.5 px wide at 960x540 on every arena', () => {
    const ring = makeNobuRing(), scene = new THREE.Scene(); scene.add(ring);
    expect(ring.name).toBe('nobu-ring');
    expect(ring.material.uniforms.uColor.value.getHex()).toBe(READ.nobuColor);
    expect(READ.nobuColor).not.toBe(READ.gold); // gold is danger; this is you
    for (const key of ARENAS) {
      const half = ARENA_CAMERAS[key].half;
      for (const [x, z] of [[0, 0], [0, half - 1], [0, -half + 1], [half - 1, -half + 1]]) {
        const cam = arenaCam(key, [960, 540], x, z);
        ring.position.set(x, 0.045, z); scene.updateMatrixWorld(true);
        const w = sizeRing(ring, cam, 540);
        expect(bandPixels(cam, 540, ring.position, READ.nobuRadius, w).min).toBeGreaterThanOrEqual(2.5);
        const across = pixelsBetween(cam, 540, new THREE.Vector3(x - READ.nobuRadius, 0, z), new THREE.Vector3(x + READ.nobuRadius, 0, z));
        expect(across).toBeGreaterThanOrEqual(16);
      }
    }
  });

  it('stays on the floor while he jumps, and hides over a pit, when he is dead and outside a fight', () => {
    const ring = makeNobuRing();
    const world = { groundBelow: vi.fn(() => 0) };
    const player = { pos: new THREE.Vector3(3, 2.4, -1), dead: false };
    placeNobuRing(ring, world, player, true);
    expect(ring.visible).toBe(true);
    expect(ring.position.toArray()).toEqual([3, 0.045, -1]);
    world.groundBelow.mockReturnValue(-Infinity); placeNobuRing(ring, world, player, true);
    expect(ring.visible).toBe(false);
    world.groundBelow.mockReturnValue(0); placeNobuRing(ring, world, { ...player, dead: true }, true);
    expect(ring.visible).toBe(false);
    placeNobuRing(ring, world, player, false);
    expect(ring.visible).toBe(false);
  });

  it('a ground ring made for any use carries its own pixel rule', () => {
    const ring = makeGroundRing(2, { cfg: READ.shadow, color: 0xffffff });
    expect(ring.userData.cfg).toBe(READ.shadow);
    expect(typeof ring.onBeforeRender).toBe('function');
    expect(ring.material.fog).toBe(false);
  });
});
