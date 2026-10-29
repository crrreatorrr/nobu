// Bonus stage: Roomba Rush. Nobu rides a runaway robot vacuum through the Owner's House.
// It drives itself; left/right steers, jump hops the whole vacuum. Bash backpacks and mice, jump cables
// and gaps, dodge toy piles, table legs, cats and rugs. A Vacuum Dock near the end pops every rug.
import * as THREE from 'three';
import { makeKit, makeTrack, turtle } from './kit.js';
import { toon } from '../player/nobuPrims.js';
import { fern, bush } from '../world/decor.js';
import { rand, pick } from '../core/util.js';

export function buildBonusRide(game, stage, tickets) {
  const track = makeTrack(stage, turtle([0, 0, 0], [
    [40, 0, 0], [30, 14, 0], [30, -20, 0], [30, 12, 0], [30, -14, 0], [30, 18, 0], [30, -10, 0], [30, 0, 0], [30, 6, 0], [30, 0, 0], [30, 0, 0],
  ]));
  const k = makeKit(game, stage, tickets, track);
  const END = 312;
  const HALF = 4.6, W = HALF * 2;
  const F = (a, b, o = {}) => k.floor(a, b, { w: W, ...o });
  k.walls([[0, HALF, HALF, 1.6], [END + 2, HALF, HALF, 1.6]]);
  k.backstop(-1.2);
  k.backstop(END);

  F(-4, 94);
  k.tut(6, 'ride');
  k.tix(0, 0, 14, 0, 0, 26, 6);
  k.toys(-2.2, 0, 32, 2.6); k.tix(2.4, 0, 29, 2.4, 0, 35, 3);
  k.toys(2.2, 0, 44, 2.6); k.tix(-2.4, 0, 41, -2.4, 0, 47, 3);
  k.cable(56);
  k.tixArc(0, 0, 54, 0, 59, 1.6, 4);
  k.packs([[-2.6, 68], [0, 68], [2.6, 68]]);
  // drive under the coffee table
  k.leg(-2.9, 0, 80, { h: 3.4 }); k.leg(2.9, 0, 80, { h: 3.4 });
  k.tix(0, 0, 77, 0, 0, 84, 4);
  // first gap: the hallway step
  k.tixArc(0, 0, 92, 0, 101, 2.2, 6);
  F(99, 196);
  k.mouse(0, 0, 106, { range: 3.4, speed: 5.5 });
  k.dog(-3.2, 0, 112, 'shiba');
  k.rug(-2.6, 0, 118); k.rug(2.6, 0, 118);
  k.tix(0, 0, 115, 0, 0, 121, 4);
  k.snacks(0, 0, 128);
  k.cable(138);
  k.toys(0, 0, 150, 2.8); k.tix(-2.8, 0, 147, -2.8, 0, 153, 3); k.tix(2.8, 0, 147, 2.8, 0, 153, 3);
  k.zipped(-2.4, 0, 160);
  k.pack(2.4, 0, 160);
  // chair-leg slalom
  k.leg(-1.6, 0, 170, { h: 4.2, color: 0xa86a3a });
  k.leg(1.6, 0, 180, { h: 4.2, color: 0xa86a3a });
  k.leg(-1.6, 0, 190, { h: 4.2, color: 0xa86a3a });
  k.tix(2.2, 0, 168, 2.2, 0, 172, 2); k.tix(-2.2, 0, 178, -2.2, 0, 182, 2);
  k.oneUp(0, 1.9, 187);
  // second gap
  k.tixArc(0, 0, 194, 0, 204, 2.6, 6);
  F(201, END + 1);
  k.sphere(0, 0, 212);
  k.cat(-2.6, 0, 222); k.pack(2.6, 0, 222);
  k.cable(234);
  k.toys(2.2, 0, 246, 2.6);
  k.dog(-3.2, 0, 250, 'corgi');
  k.rug(0, 0, 258); k.rug(-3, 0, 258);
  k.tix(2.8, 0, 255, 2.8, 0, 261, 3);
  k.packs([[-2.6, 270], [0, 270]]); k.leg(2.7, 0, 270, { h: 3.4 });
  k.mouse(0, 0, 278, { range: 3.4, speed: 6 });
  k.vacSwitch(0, 0, 286);
  k.tix(0, 0, 290, 0, 0, 300, 6);
  k.gate(302, 'EXIT', 0x3ec46d);
  k.trigger(304, () => game.session.reachGoal());

  // ---- decor: furniture and plants up on the raised floor beside the run ----
  const shelfMat = toon(0x8a5a32), lampMat = toon(0xfff1c8), potMat = toon(0xd86a3a), bookMats = [0xd84a3a, 0x3a7ad8, 0x3ab060, 0xe8b02a, 0x8a4ac8].map((c) => toon(c));
  const add = (m) => { m.castShadow = true; m.receiveShadow = true; stage.scene.add(m); return m; };
  const shelf = (p, yaw) => {
    const g = new THREE.Group();
    // open-fronted case: back, sides, shelves, with the books standing on the shelves
    const back = new THREE.Mesh(new THREE.BoxGeometry(3.4, 5, 0.15), shelfMat); back.position.set(0, 2.5, -0.5); g.add(back);
    for (const sx of [-1, 1]) { const sd = new THREE.Mesh(new THREE.BoxGeometry(0.15, 5, 1.1), shelfMat); sd.position.set(sx * 1.63, 2.5, 0); g.add(sd); }
    for (let r = 0; r < 4; r++) { const sh = new THREE.Mesh(new THREE.BoxGeometry(3.3, 0.14, 1.1), shelfMat); sh.position.set(0, 0.07 + r * 1.6, 0); g.add(sh); }
    for (let r = 0; r < 3; r++) for (let i = 0; i < 9; i++) {
      const h = rand(0.8, 1.25);
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.28, h, 0.75), pick(bookMats));
      b.position.set(-1.3 + i * 0.32, 0.14 + r * 1.6 + h / 2, 0.05); b.rotation.z = rand(-0.06, 0.06); g.add(b);
    }
    g.position.copy(p); g.rotation.y = yaw; add(g);
  };
  const lamp = (p) => {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 5, 8), toon(0x3a3a44)); pole.position.y = 2.5; g.add(pole);
    const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 1.1, 1.2, 16, 1, true), lampMat); shade.position.y = 5.2; g.add(shade);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.7, 0.2, 16), toon(0x3a3a44)); base.position.y = 0.1; g.add(base);
    g.position.copy(p); add(g);
  };
  const pot = (p) => {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.5, 1.1, 14), potMat); m.position.set(p.x, p.y + 0.55, p.z); add(m);
    fern(stage, p.x, p.y + 1.1, p.z, 1.4, 0x3ea040);
  };
  k.banks(4, END, (x, y, d, sx) => {
    // shelves face the run (left bank faces right, right bank faces left)
    const p = k.W(x, y, d), yaw = k.yawAt(d) + (sx < 0 ? -Math.PI / 2 : Math.PI / 2);
    const r = Math.random();
    if (r < 0.35) shelf(p, yaw);
    else if (r < 0.55) lamp(p);
    else if (r < 0.85) pot(p);
    else bush(stage, p.x, p.y, p.z, 1.2, 0x4aa040);
  }, { every: 9, out: [2, 3.5] });

  return {
    spawn: k.W(0, 0, 3),
    facing: track.yaw(3),
    camera: { mode: 'track', track, height: 4.9, dist: 9.6, ahead: 7.5 },
    fov: 66,
    ride: { speed: 10.5 },
  };
}
