// Ride level pieces: the robot vacuum Nobu rides, and the household hazards it has to dodge or jump.
// While riding, Nobu counts as sliding for interactions: backpacks, mice and dogs get bowled over,
// but these hazards (and cats and rugs) wreck the ride.
import * as THREE from 'three';
import { Entity } from './entity.js';
import { toon } from '../player/nobuPrims.js';
import { Assets } from '../art/assets.js';
import { audio } from '../audio/audio.js';
import { makeShadow } from './fx.js';
import { rand } from '../core/util.js';

// The vacuum Nobu stands on (attached under the player). Uses the Higgsfield vacuum model when present.
export function rideVacuumMesh() {
  const g = new THREE.Group();
  const glb = Assets.model('model_vacuum', 0.62);
  if (glb) {
    glb.scale.multiplyScalar(1.6);
    g.add(glb);
  } else {
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.8, 0.32, 28), toon(0x7a3fd0));
    disc.position.y = 0.2;
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.06, 24), toon(0x9a9aaa));
    lid.position.y = 0.39;
    const bumper = new THREE.Mesh(new THREE.TorusGeometry(0.78, 0.06, 6, 28, Math.PI), toon(0x2a2a34));
    bumper.rotation.x = -Math.PI / 2; bumper.position.y = 0.15;
    g.add(disc, lid, bumper);
    for (const sx of [-1, 1]) {
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xff3a3a }));
      e.position.set(sx * 0.25, 0.26, 0.72);
      g.add(e);
    }
  }
  // spinning side brushes
  const brushes = [];
  for (const sx of [-1, 1]) {
    const b = new THREE.Group();
    for (let i = 0; i < 3; i++) { const r = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.36), toon(0xffd23f)); r.rotation.y = (i * Math.PI * 2) / 3; r.position.y = 0; b.add(r); }
    b.position.set(sx * 0.55, 0.04, 0.55);
    g.add(b);
    brushes.push(b);
  }
  g.userData.brushes = brushes;
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return g;
}

// Base for things that wreck the ride (or trip Nobu on foot).
class Hazard extends Entity {
  constructor(stage, x, y, z, death = 'angel') {
    super(stage, x, y, z);
    this.death = death;
  }
  hit(p) {
    if (p.dead) return;
    if (p.hurt(this.death, this.pos.x, this.pos.z) && !p.dead) this.smash();
  }
  // a mask (or god mode) bulldozes through it
  smash() {
    if (this.dead) return;
    this.dead = true;
    this.obj.visible = false;
    audio.play('break');
    this.fx.burst(this.pos.x, this.pos.y + 0.4, this.pos.z, { count: 14, colors: this.colors || [0xffffff], speed: 5, size: 0.16, floor: this.pos.y });
  }
  onTouch(p) { this.hit(p); }
  onSlide(p) { if (p.god || p.invincible) this.smash(); else this.hit(p); }
  onBite() {}
  onRespawn() { this.dead = false; this.obj.visible = true; }
}

// A charging cable stretched across the floor: low, full width. Jump it.
export class FloorCable extends Hazard {
  constructor(stage, x, y, z, { width = 8, yaw = 0 } = {}) {
    super(stage, x, y, z, 'flat');
    this.colors = [0x2a2a34, 0xffffff];
    const g = new THREE.Group();
    g.rotation.y = yaw;
    const pts = [];
    for (let i = 0; i <= 16; i++) { const t = i / 16; pts.push(new THREE.Vector3((t - 0.5) * width, 0.1 + Math.sin(t * Math.PI * 3) * 0.04, Math.sin(t * Math.PI * 2) * 0.25)); }
    const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.07, 6), toon(0xf4f4f8));
    g.add(cable);
    const plug = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.22, 0.2), toon(0xf4f4f8));
    plug.position.set(width * 0.5 - 0.1, 0.12, 0);
    const prong = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.03, 0.14), toon(0xd8b040));
    for (const s of [-0.05, 0.05]) { const pr = prong.clone(); pr.position.set(width * 0.5 + 0.1, 0.12 + s, 0); g.add(pr); }
    g.add(plug);
    this.spark = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0x9ae8ff }));
    this.spark.position.set(width * 0.5 + 0.2, 0.12, 0);
    g.add(this.spark);
    this.obj.add(g);
    const c = Math.abs(Math.cos(yaw)), s = Math.abs(Math.sin(yaw));
    this.setBox(width * c + 0.6 * s, 0.32, width * s + 0.6 * c);
    this.t = rand(0, 3);
  }
  update(dt) { this.t += dt; this.spark.visible = Math.sin(this.t * 17) > 0.3; this.spark.scale.setScalar(0.7 + Math.random() * 0.6); }
}

// A tumbled pile of toy blocks: jump over it or steer around it.
const TOY_COLORS = [0xe84a3a, 0x3a7ad8, 0x3ec46d, 0xffd23f, 0x8a4ac8];
export class ToyPile extends Hazard {
  constructor(stage, x, y, z, { w = 1.8, yaw = 0 } = {}) {
    super(stage, x, y, z, 'angel');
    this.colors = TOY_COLORS;
    const g = new THREE.Group();
    g.rotation.y = yaw;
    const geo = new THREE.BoxGeometry(0.45, 0.45, 0.45);
    const n = Math.round(w * 2.2);
    for (let i = 0; i < n; i++) {
      const b = new THREE.Mesh(geo, toon(TOY_COLORS[i % TOY_COLORS.length]));
      const layer = i < n * 0.6 ? 0 : 1;
      b.position.set(rand(-w / 2 + 0.2, w / 2 - 0.2), 0.22 + layer * 0.42, rand(-0.3, 0.3));
      b.rotation.set(rand(-0.2, 0.2), rand(0, 3), rand(-0.2, 0.2));
      b.castShadow = true;
      g.add(b);
    }
    this.obj.add(g);
    // footprint of the rotated pile, a little forgiving
    const c = Math.abs(Math.cos(yaw)), sn = Math.abs(Math.sin(yaw));
    this.setBox((w * c + 0.9 * sn) * 0.9, 0.85, (w * sn + 0.9 * c) * 0.9);
  }
}

// A chunky chair / table leg: tall, steer around it.
export class FurnitureLeg extends Hazard {
  constructor(stage, x, y, z, { h = 5, color = 0x8a5a32 } = {}) {
    super(stage, x, y, z, 'angel');
    this.colors = [color, 0xffffff];
    const m = toon(color);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.34, h, 14), m);
    leg.position.y = h / 2;
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.4, 0.4, 0.12, 14), toon(0xd8d0c0));
    foot.position.y = 0.06;
    const top = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 2.4), m);
    top.position.y = h;
    leg.castShadow = top.castShadow = true;
    this.obj.add(leg, foot, top);
    this.shadow = makeShadow(1.6); this.shadow.position.y = 0.02; this.obj.add(this.shadow);
    this.setBox(0.7, h, 0.7);
  }
  // too big to smash: a masked hit just bounces you off
  smash() {}
}
