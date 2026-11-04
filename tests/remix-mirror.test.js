import { afterEach, describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
vi.mock('../src/art/assets.js', () => ({ Assets: { model: () => null, tex: () => new THREE.Texture(), tiled: () => new THREE.Texture(), aspect: () => 1, has: () => false } }));
vi.mock('../src/core/util.js', async original => ({ ...(await original()), canvasTex: () => new THREE.Texture() }));
vi.mock('../src/audio/audio.js', () => ({ audio: { play: vi.fn() } }));
import { Track, turtle } from '../src/world/track.js';
import { Stage } from '../src/world/stage.js';
import { makeKit, makeTrack } from '../src/levels/kit.js';
const points = () => turtle([5, 2, 8], [[24, 38, 1], [30, -61, -2], [26, 14, 1]]);
const reflect = p => new THREE.Vector3(10 - p.x, p.y, p.z);
function near(a, b) { expect(a.x).toBeCloseTo(b.x, 4); expect(a.y).toBeCloseTo(b.y, 4); expect(a.z).toBeCloseTo(b.z, 4); }
function fixture(mirror) {
  const game = { session: { remix: mirror, nextSeq: () => 1 }, player: { pos: new THREE.Vector3(), body: {} }, ui: { tutorial: vi.fn() }, fx: {} };
  const stage = new Stage(game, 1), tickets = { add: vi.fn() };
  const track = makeTrack(stage, points());
  return { stage, track, k: makeKit(game, stage, tickets, track), tickets };
}
afterEach(() => vi.restoreAllMocks());
describe('remix physical reflection', () => {
  it('reflects a nonzero-origin unequal curved track once without changing its length or height', () => {
    const a = new Track(points()), b = new Track(points(), { mirror: true });
    expect(b.length).toBeCloseTo(a.length, 9);
    for (const d of [-4, 0, 15, 37, 60, a.length + 3]) for (const u of [-3, 0, 2]) {
      near(b.authorToWorld(d, u, .7), reflect(a.toWorld(d, u, .7)));
      expect(b.heightAt(d)).toBeCloseTo(a.heightAt(d), 6);
    }
    const p = a.toWorld(32, 2), q = reflect(p);
    expect(b.project(q.x, q.z).s).toBeCloseTo(a.project(p.x, p.z).s, 5);
    expect(b.project(q.x, q.z).u).toBeCloseTo(-a.project(p.x, p.z).u, 5);
    // These incorrect alternatives have the same arc length but wrong placements.
    expect(b.toWorld(32, 2).distanceTo(q)).toBeGreaterThan(3.9);
    expect(b.authorToWorld(32, -2).distanceTo(q)).toBeGreaterThan(3.9);
  });
  it('reflects actual authored floors, asymmetric walls, warp intervals and World support', () => {
    const a = fixture(false), b = fixture(true);
    for (const f of [a, b]) {
      f.k.floor(0, 70, { x: 2, w: 2, y: [.5, 1.5] });
      f.k.walls([[0, 3, 6, 2], [70, 4, 7, 3]]);
      f.k.warp(10, 18, 1, 3, 'cave');
      f.k.trigger(40, () => {});
    }
    expect(b.track.spans[0].u).toBe(-2);
    const wa = a.track.wallAt(30), wb = b.track.wallAt(30);
    expect(wb.left).toBeCloseTo(wa.right); expect(wb.right).toBeCloseTo(wa.left);
    const p = a.k.W(2, 0, 35), q = b.k.W(2, 0, 35);
    near(q, reflect(p));
    expect(a.stage.world.groundBelow(p.x, p.y + 5, p.z)).toBeCloseTo(b.stage.world.groundBelow(q.x, q.y + 5, q.z), 5);
    expect(b.track.groundAt(35, 2)).toBeNull();
    expect(b.track.secretAt(14, -2)).toBe('cave'); expect(b.track.secretAt(14, 2)).toBeNull();
    expect(b.track.triggers.map(t => t.d)).toEqual([40]);
  });
  it('reflects entity AABBs, static rewards and real moving platforms at every phase', () => {
    const a = fixture(false), b = fixture(true);
    const builds = f => {
      const pack = f.k.pack(2, 0, 30), pad = f.k.mover(-1.2, 2, 42, { axis: 'x', range: 2, speed: 1.3, phase: .4, w: 2, d: 3 });
      f.k.tix(-2, 1, 10, 3, 2, 18, 5);
      return { pack, pad };
    };
    const x = builds(a), y = builds(b);
    near(y.pack.pos, reflect(x.pack.pos));
    expect(y.pack.solid.min.x).toBeCloseTo(10 - x.pack.solid.max.x, 4);
    expect(y.pack.solid.max.x).toBeCloseTo(10 - x.pack.solid.min.x, 4);
    a.tickets.add.mock.calls.forEach((p, i) => near(new THREE.Vector3(...b.tickets.add.mock.calls[i]), reflect(new THREE.Vector3(...p))));
    for (let i = 0; i < 160; i++) {
      x.pad.update(.025); y.pad.update(.025);
      near(y.pad.pos, reflect(x.pad.pos));
      expect(y.pad.solid.max.x).toBeCloseTo(10 - x.pad.solid.min.x, 4);
      expect(y.pad.solid.max.y).toBeCloseTo(x.pad.solid.max.y, 4);
    }
  });
  it('reflects a lateral conveyor while retaining longitudinal current and caller data', () => {
    const a = fixture(false), b = fixture(true), push = { x: 3, z: -2 };
    const sa = a.k.floor(0, 10, { conveyor: push }), sb = b.k.floor(0, 10, { conveyor: push });
    expect(sa.conveyor).toBe(push); expect(sb.conveyor).toEqual({ x: -3, z: -2 });
    expect(push).toEqual({ x: 3, z: -2 });
    near(b.k.rightAt(20), new THREE.Vector3(-a.k.rightAt(20).x, 0, a.k.rightAt(20).z));
  });
});
