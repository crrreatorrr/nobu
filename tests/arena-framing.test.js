import * as THREE from 'three';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameCamera, ARENA_FIT, requiredTan, fitPoints } from '../src/camera/camera.js';
import { ARENA_CAMERAS, arenaCamera } from '../src/levels/arenaCameras.js';
import { PointSet, collectThreats, NOBU_REACH } from '../src/bosses/threats.js';
import { Projectiles, makeMarker } from '../src/bosses/common.js';
import { World } from '../src/world/physics.js';
import { audio } from '../src/audio/audio.js';

/**
 * The arena lens widens to keep the fight in frame (GameCamera "Arena fit"). These tests are the
 * framing guarantee: at 960x540, 1280x720 and 4:3 the lens is never tighter than the authored one (so
 * it hides nothing the authored camera shows), it frames Nobu, the boss, every marker and every
 * projectile with a margin whenever its range allows, on the very frame they appear, and it changes
 * nothing but the field of view.
 */
const VIEWPORTS = [[960, 540], [1280, 720], [1024, 768]];
const FIT_ARENAS = ['bird', 'cat', 'cone', 'titan'];
// The Queen's camera pans with Nobu far more (follow 0.4); it has the same widen-only fit and guarantee.
const GUARANTEE_ARENAS = [...FIT_ARENAS, 'queen'];

/** Deterministic random numbers, so a failure can be replayed. */
function rng(seed) {
  let s = seed >>> 0;
  return (a = 0, b = 1) => { s = (s * 1664525 + 1013904223) >>> 0; return a + (b - a) * (s / 4294967296); };
}
const makePlayer = (x = 0, z = 0, y = 0) => ({ pos: new THREE.Vector3(x, y, z), body: { grounded: y === 0, s: 0, u: 0 } });

/** A camera on one arena with a fight to frame. `scene.points` is [x, y, z, kind] rows added to Nobu's own. */
function rig(key, [vw, vh], scene, { fit = true } = {}) {
  const camera = new GameCamera(vw / vh);
  const opts = arenaCamera(key);
  const base = ARENA_CAMERAS[key].fov;
  opts.focus = scene.boss; opts.focusWeight = 0.2; // as Session sets it when the fight starts
  if (fit) {
    opts.fit.baseFov = base;
    opts.fit.collect = (set) => {
      const p = scene.player.pos;
      set.add(p.x, p.y, p.z, 'nobu'); set.add(p.x, p.y + 1.4, p.z, 'nobu');
      set.add(scene.boss.x, scene.boss.y, scene.boss.z, 'boss'); set.add(scene.boss.x, scene.boss.y + 2.5, scene.boss.z, 'boss');
      for (const [x, y, z, kind] of scene.points) set.add(x, y, z, kind);
    };
  } else delete opts.fit;
  camera.setMode('arena', opts);
  camera.cam.fov = base; camera.cam.updateProjectionMatrix();
  camera.snap(scene.player);
  return { camera, opts, base, half: ARENA_CAMERAS[key].half };
}

/** Every point the fight wants framed, as the camera's own fit sees them (clamped to the floor). */
function framedPoints(r) { return fitPoints(r.opts, new PointSet()); }
/** |x|, |y| of a point in normalised device coordinates for a lens of half-angle tangent `tan`. */
function ndc(cam, tan, x, y, z) {
  const v = new THREE.Vector3(x, y, z).applyMatrix4(cam.matrixWorldInverse);
  return v.z > -0.5 ? null : { x: Math.abs(v.x / -v.z) / (tan * cam.aspect), y: Math.abs(v.y / -v.z) / tan };
}
const tanOf = (cam) => Math.tan(cam.fov * Math.PI / 360);

/** Asserts the guarantee on the camera as it stands. */
function expectFramed(r, label) {
  const cam = r.camera.cam;
  cam.updateMatrixWorld();
  const now = tanOf(cam), authored = Math.tan(r.base * Math.PI / 360), widest = authored / ARENA_FIT.minZoom;
  expect(now, label).toBeGreaterThanOrEqual(authored / ARENA_FIT.maxIn - 1e-9);
  expect(now, label).toBeLessThanOrEqual(widest + 1e-9);
  const atWidest = now >= widest - 1e-9;
  const set = framedPoints(r);
  for (let i = 0; i < set.n; i++) {
    const [x, y, z] = [set.xyz[i * 3], set.xyz[i * 3 + 1], set.xyz[i * 3 + 2]];
    const was = ndc(cam, authored, x, y, z), is = ndc(cam, now, x, y, z);
    if (!is) continue; // behind the camera for any lens
    const where = `${label}: ${set.kinds[i]} at ${x.toFixed(1)}, ${y.toFixed(1)}, ${z.toFixed(1)}`;
    // 1. Nothing the authored lens shows is cropped out.
    if (was.x <= 1 && was.y <= 1) expect(Math.max(is.x, is.y), where).toBeLessThanOrEqual(1 + 1e-4);
    // 2. Unless the lens is already as wide as it goes, everything is inside its margin.
    // (The floor around Nobu and lane ends are soft: they never widen the lens past the authored one.)
    if (!atWidest && !['reach', 'lane'].includes(set.kinds[i])) {
      const m = { reach: ARENA_FIT.reachMargin, boss: ARENA_FIT.bossMargin }[set.kinds[i]] ?? ARENA_FIT.margin;
      expect(Math.max(is.x, is.y), where).toBeLessThanOrEqual(m + 1e-4);
    }
  }
}

function randomScene(rand, half) {
  const on = () => rand(-half, half);
  const player = makePlayer(on(), on(), rand() < 0.3 ? rand(0, 4) : 0);
  const boss = new THREE.Vector3(rand(-half, half), rand() < 0.5 ? 0 : rand(0, 9), rand(-half, half));
  const points = [];
  for (let i = Math.floor(rand(0, 7)); i > 0; i--) points.push([on(), 0.05, on(), 'marker']);
  for (let i = Math.floor(rand(0, 9)); i > 0; i--) points.push([on(), rand(0.4, 3), on(), 'projectile']);
  return { player, boss, points };
}

describe('arena fit: the framing guarantee', () => {
  it.each(GUARANTEE_ARENAS.flatMap((key) => VIEWPORTS.map((vp) => [key, vp])))('%s at %j: no threat the authored lens shows is ever cropped, through moves, spawns and shake', (key, vp) => {
    const rand = rng(key.length * 7919 + vp[0]);
    for (let n = 0; n < 60; n++) {
      const scene = randomScene(rand, ARENA_CAMERAS[key].half);
      const r = rig(key, vp, scene);
      expectFramed(r, `${key} scene ${n} snap`);
      const vel = new THREE.Vector3(rand(-7, 7), 0, rand(-7, 7)), bossVel = new THREE.Vector3(rand(-20, 20), rand(-12, 12), rand(-20, 20));
      const half = r.half;
      for (let f = 0; f < 90; f++) {
        const p = scene.player.pos;
        p.x = Math.max(-half, Math.min(half, p.x + vel.x / 60)); p.z = Math.max(-half, Math.min(half, p.z + vel.z / 60));
        scene.boss.x = Math.max(-half, Math.min(half, scene.boss.x + bossVel.x / 60));
        scene.boss.z = Math.max(-half, Math.min(half, scene.boss.z + bossVel.z / 60));
        scene.boss.y = Math.max(0, Math.min(9, scene.boss.y + bossVel.y / 60));
        // a threat appears anywhere on the floor with no warning to the camera; another one ends
        if (rand() < 0.08) scene.points.push([rand(-half, half), 0.05, rand(-half, half), rand() < 0.5 ? 'marker' : 'projectile']);
        if (rand() < 0.04 && scene.points.length) scene.points.shift();
        if (rand() < 0.05) r.camera.shake(rand(0.2, 0.7), 0.4);
        r.camera.update(1 / 60, scene.player);
        expectFramed(r, `${key} ${vp.join('x')} scene ${n} frame ${f}`);
      }
    }
  });

  it('a threat that appears outside the frame is framed on the very next update', () => {
    for (const key of FIT_ARENAS) for (const vp of VIEWPORTS) {
      // Nobu at the far edge: the authored camera pans up the arena and the near floor leaves the frame
      const half = ARENA_CAMERAS[key].half;
      const scene = { player: makePlayer(0, -half + 1), boss: new THREE.Vector3(0, 0, -2), points: [] };
      const r = rig(key, vp, scene);
      for (let f = 0; f < 60; f++) r.camera.update(1 / 60, scene.player);
      expect(r.camera.fitZoom).toBeCloseTo(1, 6); // nothing to widen for: exactly the authored lens
      const cam = r.camera.cam; cam.updateMatrixWorld();
      const spot = new THREE.Vector3(half * 0.5, 0.05, half - 2);
      const before = ndc(cam, tanOf(cam), spot.x, spot.y, spot.z);
      expect(Math.max(before.x, before.y), `${key} ${vp}`).toBeGreaterThan(ARENA_FIT.margin); // out of frame, or crowding its edge
      scene.points.push([spot.x, spot.y, spot.z, 'marker']);
      r.camera.update(1 / 60, scene.player);
      expectFramed(r, `spawn on ${key} at ${vp.join('x')}`);
      expect(r.camera.fitZoom).toBeLessThan(1);
      const q = ndc(cam, tanOf(cam), spot.x, spot.y, spot.z);
      // inside its margin, unless that takes a wider lens than the fit allows; then it is as wide as it goes
      if (r.camera.fitZoom > ARENA_FIT.minZoom + 1e-6) expect(Math.max(q.x, q.y), `${key} ${vp}`).toBeLessThanOrEqual(ARENA_FIT.margin + 1e-4);
    }
  });

  it('is never tighter than the authored lens, widens at once and eases back slowly', () => {
    const scene = { player: makePlayer(0, 4), boss: new THREE.Vector3(0, 0, 1), points: [] };
    const r = rig('cat', [960, 540], scene);
    for (let f = 0; f < 120; f++) { r.camera.update(1 / 60, scene.player); expect(r.camera.fitZoom).toBeCloseTo(1, 9); }
    expect(r.camera.cam.fov).toBeCloseTo(ARENA_CAMERAS.cat.fov, 6);
    expect(ARENA_FIT.maxIn).toBe(1);
    scene.boss.set(-11, 8.5, -11); // the boss flies to the far corner, high up
    r.camera.update(1 / 60, scene.player);
    const wide = r.camera.fitZoom;
    expect(wide).toBeLessThan(1);
    expectFramed(r, 'boss to the far corner');
    scene.boss.set(0, 0, 1);
    const zooms = [wide];
    for (let f = 0; f < 30; f++) { r.camera.update(1 / 60, scene.player); zooms.push(r.camera.fitZoom); }
    for (let i = 1; i < zooms.length; i++) {
      expect(zooms[i]).toBeGreaterThanOrEqual(zooms[i - 1] - 1e-9);
      expect(zooms[i] - zooms[i - 1]).toBeLessThanOrEqual(ARENA_FIT.inRate / 60 + 1e-6);
    }
    for (let f = 0; f < 600; f++) r.camera.update(1 / 60, scene.player);
    expect(r.camera.fitZoom).toBeCloseTo(1, 6);
    scene.points.push([12, 0.05, 12, 'marker'], [-12, 0.05, 12, 'marker'], [0, 0.05, -12, 'marker']); // more than any lens here can hold
    scene.player.pos.set(0, 0, -11);
    for (let f = 0; f < 90; f++) r.camera.update(1 / 60, scene.player);
    expect(r.camera.fitZoom).toBeGreaterThanOrEqual(ARENA_FIT.minZoom - 1e-9);
  });

  it('changes only the field of view: position, aim and the movement basis are the authored ones', () => {
    const rand = rng(42);
    for (const key of FIT_ARENAS) {
      const scene = randomScene(rand, ARENA_CAMERAS[key].half);
      const a = rig(key, [960, 540], scene), b = rig(key, [960, 540], scene, { fit: false });
      for (let f = 0; f < 120; f++) {
        scene.player.pos.x += 0.05; scene.boss.z += 0.03;
        a.camera.update(1 / 60, scene.player); b.camera.update(1 / 60, scene.player);
      }
      expect(a.camera.cam.position.toArray()).toEqual(b.camera.cam.position.toArray());
      expect(a.camera.cam.quaternion.toArray()).toEqual(b.camera.cam.quaternion.toArray());
      expect(a.camera.basis.forward.toArray()).toEqual(b.camera.basis.forward.toArray());
      expect(a.camera.basis.right.toArray()).toEqual(b.camera.basis.right.toArray());
      expect(b.camera.cam.fov).toBe(ARENA_CAMERAS[key].fov);
      expect(b.camera.fitZoom).toBe(1);
    }
  });

  it('eases back to the authored lens for a cinematic and when the arena has no fit', () => {
    const scene = { player: makePlayer(0, -10), boss: new THREE.Vector3(0, 0, 1), points: [[9, 0.05, 9, 'marker']] };
    const r = rig('titan', [1280, 720], scene);
    for (let f = 0; f < 30; f++) r.camera.update(1 / 60, scene.player);
    expect(r.camera.cam.fov).toBeGreaterThan(r.base + 2);
    r.camera.cinematic(new THREE.Vector3(3, 3, 9), new THREE.Vector3(0, 1, 0));
    for (let f = 0; f < 240; f++) r.camera.update(1 / 60, scene.player);
    expect(r.camera.cam.fov).toBeCloseTo(r.base, 1);
    r.camera.endCinematic();
    r.camera.setMode('behind', {});
    r.camera.update(1 / 60, scene.player);
    expect(r.camera.fitZoom).toBe(1);
  });

  it('the Queen arena keeps its authored camera and widens only', () => {
    const q = arenaCamera('queen');
    expect(q.fit).toEqual({ half: ARENA_CAMERAS.queen.half });
    expect(q.offset).toEqual({ x: 0, y: 15, z: 19 });
    expect(q.follow).toBe(0.4);
  });

  it('leaves Nobu exactly as large as the authored camera draws him whenever the fight fits', () => {
    for (const key of FIT_ARENAS) for (const vp of VIEWPORTS) {
      const scene = { player: makePlayer(0, 3), boss: new THREE.Vector3(1.5, 0, 0), points: [[0, 0.05, 3, 'marker']] };
      const fitted = rig(key, vp, scene), plain = rig(key, vp, scene, { fit: false });
      for (let f = 0; f < 120; f++) { fitted.camera.update(1 / 60, scene.player); plain.camera.update(1 / 60, scene.player); }
      expect(fitted.camera.cam.fov).toBeCloseTo(plain.camera.cam.fov, 6);
    }
  });
});

describe('what the fit frames', () => {
  beforeEach(() => {
    vi.spyOn(audio, 'play').mockImplementation(() => {});
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(new Proxy({}, { get: (o, k) => o[k] ?? (() => {}) }));
  });
  afterEach(() => vi.restoreAllMocks());

  function fight() {
    const player = { pos: new THREE.Vector3(2, 0, 5), vel: new THREE.Vector3(), forward: new THREE.Vector3(0, 0, 1),
      body: { grounded: true }, biteT: -1, hurt: vi.fn(), trap: vi.fn(), cone: vi.fn(), bounce: vi.fn() };
    const game = { player, camera: { shake: vi.fn() }, fx: new Proxy({}, { get: () => () => {} }) };
    const stage = { game, scene: new THREE.Scene(), world: new World() };
    const boss = { key: 'bird', active: true, state: 'aim', pos: new THREE.Vector3(0, 8.5, -3), size: { h: 2, oy: -1 } };
    return { player, boss, projectiles: new Projectiles(game, stage), scene: stage.scene };
  }
  const kinds = (set) => { const c = {}; for (let i = 0; i < set.n; i++) c[set.kinds[i]] = (c[set.kinds[i]] || 0) + 1; return c; };
  const has = (set, x, y, z) => { for (let i = 0; i < set.n; i++) if (Math.hypot(set.xyz[i * 3] - x, set.xyz[i * 3 + 1] - y, set.xyz[i * 3 + 2] - z) < 1e-6) return true; return false; };

  it('Nobu, the floor around him, the boss from foot to head', () => {
    const f = fight(), set = collectThreats(f);
    expect(kinds(set)).toEqual({ nobu: 2, reach: 4, boss: 2 });
    expect(has(set, 2, 1.4, 5)).toBe(true);
    expect(has(set, 2 + NOBU_REACH, 0, 5)).toBe(true);
    expect(has(set, 0, 7.5, -3)).toBe(true); expect(has(set, 0, 9.5, -3)).toBe(true);
  });

  it('every active landing marker at its full hit radius, from its first frame', () => {
    const f = fight();
    const drop = f.projectiles.dropCone(-6, 0, 3, 0.9, 1.4); // its shadow starts at half size; the hit radius does not
    const owned = makeMarker(1.7); owned.position.set(4, 0.06, -2); f.scene.add(owned);
    const hidden = makeMarker(2.4); hidden.visible = false; f.scene.add(hidden);
    const set = collectThreats(f);
    expect(kinds(set).marker).toBe(10);
    for (const [x, z] of [[-6 - 1.4, 3], [-6 + 1.4, 3], [-6, 3 - 1.4], [-6, 3 + 1.4]]) expect(has(set, x, 0.05, z)).toBe(true);
    for (const [x, z] of [[4 - 1.7, -2], [4 + 1.7, -2], [4, -2 - 1.7], [4, -2 + 1.7]]) expect(has(set, x, 0.06, z)).toBe(true);
    expect(drop.marker.scale.x).toBe(0.5);
  });

  it('projectiles in flight, lanes and laser spots, but not an expanding shockwave', () => {
    const f = fight();
    f.projectiles.feather(new THREE.Vector3(3, 1.05, -8), new THREE.Vector3(0, 0, 1));
    f.projectiles.roller(new THREE.Vector3(-9, 0, -9), new THREE.Vector3(1, 0, 0));
    f.projectiles.shockwave(0, 0, 0);
    f.projectiles.scratch(new THREE.Vector3(1, 0, 1), new THREE.Vector3(5, 0, 1));
    f.boss.lane = new THREE.Mesh(new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2));
    f.boss.lane.scale.set(2, 1, 10); f.boss.lane.position.set(0, 0.03, 4); f.scene.add(f.boss.lane);
    f.boss.beam = { group: { visible: true }, to: new THREE.Vector3(-7, 0, 6) };
    const set = collectThreats(f), c = kinds(set);
    expect(c.projectile).toBe(4); // feather, roller, both ends of the scratch
    expect(c.lane).toBe(4); expect(c.beam).toBe(1);
    expect(c.laneEnd).toBe(1); expect(has(set, 0, 0.03, 9)).toBe(true); // the far end, framed even if that widens the lens
    expect(has(set, 3, 1.05, -8)).toBe(true); expect(has(set, 1, 0.03, 9)).toBe(true); expect(has(set, -7, 0, 6)).toBe(true);
  });

  it('requiredTan is exact: at that lens the worst point sits on its margin', () => {
    const camera = new GameCamera(16 / 9);
    camera.cam.position.set(0, 13, 20); camera.cam.lookAt(0, 1.2, 0); camera.cam.updateMatrixWorld();
    const set = new PointSet().add(-9, 0, 6, 'marker').add(3, 1, -4, 'projectile');
    const t = requiredTan(camera.cam, set);
    camera.cam.fov = Math.atan(t) * 360 / Math.PI; camera.cam.updateProjectionMatrix();
    const worst = Math.max(...[[-9, 0, 6], [3, 1, -4]].map((p) => { const v = new THREE.Vector3(...p).project(camera.cam); return Math.max(Math.abs(v.x), Math.abs(v.y)); }));
    expect(worst).toBeCloseTo(ARENA_FIT.margin, 5);
  });
});
