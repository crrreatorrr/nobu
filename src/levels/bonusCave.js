// Bonus stage: Glowworm Grotto. Pitch dark; Lumi the glowworm lights a circle around Nobu and fades over
// time. When the glow runs out Lumi waits at the next glow nest, a faint beacon in the dark.
// Shellbacks, Lid Knights, steel lunchbox stepping stones, arrow launches and crumbling ledges.
import * as THREE from 'three';
import { makeKit, makeTrack, turtle } from './kit.js';
import { Glowworm } from '../entities/glowworm.js';
import { rand, pick } from '../core/util.js';

export function buildBonusCave(game, stage, tickets) {
  const track = makeTrack(stage, turtle([0, 0, 0], [
    [36, 0, 0], [30, -16, -1], [30, 20, 0.6], [30, -12, -0.8], [30, 16, 0], [30, -20, 1], [30, 12, 0], [30, 0, -0.6], [24, 0, 0],
  ]));
  const k = makeKit(game, stage, tickets, track);
  const END = 252;
  const HALF = 4.3, W = HALF * 2;
  const F = (a, b, o = {}) => k.floor(a, b, { w: W, ...o });
  k.walls([[0, HALF, HALF, 5], [END + 2, HALF, HALF, 5]]);
  k.backstop(-1.2);
  k.backstop(END);

  F(-4, 30);
  k.tut(4, 'glowworm');
  k.tix(0, 0, 8, 0, 0, 16, 5);
  k.packs([[-2.4, 14], [2.4, 14]]);
  k.shellback(0, 0, 22, { range: 2.4 });
  k.tixArc(0, 0, 28, 0, 36, 2.2, 5);
  F(34, 62);
  // arrow lunchbox up to a floating 1UP
  k.arrowBox(2.6, 0, 42, 16.5);
  k.oneUp(2.6, 5.4, 42);
  k.knight(0, 0, 50, { range: 2.2 });
  k.barkRock(3, 0, 88, { prize: 'tickets', tickets: 15 });
  k.pack(-2.8, 0, 54);
  k.dog(-3, 0, 58, 'pug');
  // crumbling ledges and a steel step over the first pit
  k.crumble(-1.2, 0, 65, { w: 2.6, d: 2.6 });
  k.crumble(1.2, 0, 68.5, { w: 2.6, d: 2.6 });
  k.crumble(-1.2, 0, 72, { w: 2.6, d: 2.6 });
  k.lunch(0.6, -0.5, 75.5);
  k.tix(-1.2, 0.2, 65, 1.2, 0.2, 72, 3);
  F(78.5, 120);
  k.zipped(0, 0, 84);
  k.snacks(-2.6, 0, 90);
  k.spiky(0, 0, 96, { range: 2.6 });
  k.shellback(1.5, 0, 104, { range: 2 });
  k.sphere(-2.6, 0, 108);
  k.stack(2.8, 0, 114, 2);
  // moving rafts over the underground drop
  k.mover(0, 0, 125, { axis: 'x', range: 2.4, speed: 1.6, w: 2.6, d: 2.6 });
  k.mover(0, 0, 131.5, { axis: 'x', range: 2.4, speed: 1.9, w: 2.6, d: 2.6, phase: Math.PI });
  k.tix(0, 0.5, 125, 0, 0.5, 132, 4);
  F(135, 182);
  k.knight(0, 0, 142, { range: 2.4 });
  k.packs([[-2.6, 146], [2.6, 146]]);
  k.zipped(0, 0, 150);
  k.arrowBox(-2.6, 0, 158, 16);
  k.tixRing(-2.6, 4.2, 158, 1.1, 8);
  k.colorBone(-2.6, 3.2, 158, 'red');
  k.dog(3, 0, 164, 'shiba');
  k.drone(0, 1.2, 172, { range: 2.8 });
  // lunchbox stepping stones over a pit
  F(195, END + 1);
  k.lunch(-1.5, -0.6, 185);
  k.lunch(1.5, -0.6, 189);
  k.lunch(-1.2, -0.6, 192.6);
  k.tix(-1.5, 0.6, 185, -1.2, 0.6, 192.6, 3);
  // a Shellback flipped on its back makes a handy springboard up to the high tickets
  k.shellback(0, 0, 204, { range: 1.5 });
  k.tixArc(0, 2.5, 200, 0, 208, 2.5, 6);
  k.cat(2.7, 0, 214); k.pack(-2.7, 0, 214);
  k.drone(0, 1.2, 222, { range: 2.8 });
  k.packs([[-2.4, 230], [0, 230], [2.4, 230]]);
  k.tix(0, 0, 232, 0, 0, 240, 5);
  k.gate(243, 'EXIT', 0x3ec46d);
  k.trigger(245, () => game.session.reachGoal());

  // ---- decor: glowing crystals and stalagmites ----
  const crystalMats = [0x7af0ff, 0xb08aff, 0x8affc8].map((c) => new THREE.MeshBasicMaterial({ color: c }));
  const crystal = (p, s) => {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const h = rand(0.6, 1.6) * s;
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.16 * s, h, 5), pick(crystalMats));
      c.position.set(rand(-0.3, 0.3) * s, h / 2, rand(-0.3, 0.3) * s);
      c.rotation.set(rand(-0.35, 0.35), rand(0, 3), rand(-0.35, 0.35));
      g.add(c);
    }
    g.position.copy(p);
    stage.scene.add(g);
  };
  k.banks(4, END, (x, y, d) => {
    if (Math.random() < 0.45) crystal(k.W(x, y, d), rand(1, 1.8));
    else k.rock(x, y, d, rand(0.9, 1.8), 0x3a2e4a, { strata: true });
  }, { every: 6 });
  k.edges(4, END, (x, y, d) => (Math.random() < 0.4 ? crystal(k.W(x, y, d), 0.6) : k.rock(x, y, d, rand(0.3, 0.6), 0x2e2440)), { every: 5 });

  const worm = new Glowworm(stage, track, [2, 60, 118, 176, 226]);
  stage.add(worm);

  return {
    spawn: k.W(0, 0, 3),
    facing: track.yaw(3),
    camera: { mode: 'track', track, height: 4.3, dist: 8.4, ahead: 5 },
    fov: 60,
  };
}
